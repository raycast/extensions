import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

import { getPreferenceValues } from "@raycast/api";

import type { ExternalAdapterManifest } from "../types";
import { parseSessionTimeoutMinutes } from "../utils/credential-vault";
import {
  EXTERNAL_ADAPTER_MAX_BUFFER,
  EXTERNAL_ADAPTER_TIMEOUT_MS,
  EXTERNAL_PROTOCOL_VERSION,
  ExternalAdapterError,
  parseExternalMessage,
  type ExternalAdapterMethod,
} from "./external-protocol";

const DISPOSE_KILL_GRACE_MS = 500;

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const sessions = new Map<string, ExternalAdapterSession>();
let scheduledDispose: ReturnType<typeof setTimeout> | undefined;
let biometricUnlockInProgress = false;

export function getSessionIdleTimeoutMs(): number {
  const preferences = getPreferenceValues<{ sessionTimeoutMinutes?: string }>();
  return parseSessionTimeoutMinutes(preferences.sessionTimeoutMinutes) * 60_000;
}

export function getExistingSession(adapterId: string): ExternalAdapterSession | undefined {
  return sessions.get(adapterId);
}

export function getOrCreateSession(manifest: ExternalAdapterManifest): ExternalAdapterSession {
  const existing = sessions.get(manifest.id);
  if (existing?.isAlive) {
    return existing;
  }

  const session = new ExternalAdapterSession(manifest);
  sessions.set(manifest.id, session);
  return session;
}

export async function disposeSession(adapterId: string): Promise<void> {
  const session = sessions.get(adapterId);
  if (!session) {
    return;
  }

  sessions.delete(adapterId);
  await session.dispose();
}

export async function disposeAllSessions(): Promise<void> {
  const active = [...sessions.values()];
  sessions.clear();
  await Promise.all(active.map((session) => session.dispose()));
}

export function setBiometricUnlockInProgress(value: boolean): void {
  biometricUnlockInProgress = value;
  if (value) {
    cancelScheduledDispose();
  }
}

export function isBiometricUnlockInProgress(): boolean {
  return biometricUnlockInProgress;
}

export function cancelScheduledDispose(): void {
  if (scheduledDispose) {
    clearTimeout(scheduledDispose);
    scheduledDispose = undefined;
  }
}

export function scheduleDisposeAllSessions(delayMs: number): void {
  if (biometricUnlockInProgress) {
    return;
  }

  cancelScheduledDispose();
  scheduledDispose = setTimeout(() => {
    scheduledDispose = undefined;
    if (biometricUnlockInProgress) {
      return;
    }

    void disposeAllSessions();
  }, delayMs);
}

export class ExternalAdapterSession {
  private child: ChildProcessWithoutNullStreams | undefined;
  private stdoutBuffer = "";
  private readonly pending = new Map<string, PendingRequest>();
  private starting: Promise<void> | undefined;
  private disposed = false;
  private nextId = 1;

  constructor(private readonly manifest: ExternalAdapterManifest) {}

  get isAlive(): boolean {
    return !this.disposed && this.child !== undefined && this.child.exitCode === null && this.child.signalCode === null;
  }

  async invoke(method: ExternalAdapterMethod, params: Record<string, unknown> = {}): Promise<unknown> {
    if (this.disposed) {
      throw new ExternalAdapterError("External adapter session is disposed");
    }

    await this.ensureStarted();
    return this.send(method, params, EXTERNAL_ADAPTER_TIMEOUT_MS);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    if (this.child && this.child.exitCode === null) {
      try {
        await this.send("lockSession", {}, 1_000);
      } catch {
        // Best-effort lock before killing the helper.
      }
    }

    this.rejectAllPending(new ExternalAdapterError("External adapter session disposed"));
    await this.killChild();

    if (sessions.get(this.manifest.id) === this) {
      sessions.delete(this.manifest.id);
    }
  }

  private ensureStarted(): Promise<void> {
    if (this.isAlive) {
      return Promise.resolve();
    }

    if (this.starting) {
      return this.starting;
    }

    this.starting = this.start().finally(() => {
      this.starting = undefined;
    });

    return this.starting;
  }

  private start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.manifest.executable, this.manifest.args, {
        cwd: this.manifest.workingDirectory,
        env: { ...process.env, ...this.manifest.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.child = child;

      const onSpawn = () => {
        child.off("error", onError);
        resolve();
      };

      const onError = (error: Error) => {
        child.off("spawn", onSpawn);
        this.disposed = true;
        if (sessions.get(this.manifest.id) === this) {
          sessions.delete(this.manifest.id);
        }
        reject(error);
      };

      child.once("spawn", onSpawn);
      child.once("error", onError);

      child.stdout.on("data", (chunk: Buffer | string) => {
        this.stdoutBuffer += chunk.toString();
        if (this.stdoutBuffer.length > EXTERNAL_ADAPTER_MAX_BUFFER) {
          this.rejectAllPending(new ExternalAdapterError("External adapter output exceeded max buffer"));
          child.kill();
          return;
        }

        this.consumeStdout();
      });

      child.on("close", () => {
        this.disposed = true;
        this.child = undefined;
        this.rejectAllPending(new ExternalAdapterError("External adapter process exited"));
        if (sessions.get(this.manifest.id) === this) {
          sessions.delete(this.manifest.id);
        }
      });
    });
  }

  private consumeStdout(): void {
    const lines = this.stdoutBuffer.split("\n");
    this.stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        this.handleMessage(line);
      } catch (error) {
        const pending = this.pending.size === 1 ? [...this.pending.values()][0] : undefined;
        if (pending) {
          const id = [...this.pending.keys()][0];
          if (id) {
            this.pending.delete(id);
            clearTimeout(pending.timeout);
            pending.reject(error instanceof Error ? error : new ExternalAdapterError(String(error)));
          }
        }
      }
    }
  }

  private handleMessage(line: string): void {
    const response = parseExternalMessage(line);
    const pending =
      (response.id !== undefined ? this.pending.get(response.id) : undefined) ??
      (this.pending.size === 1 ? [...this.pending.values()][0] : undefined);
    const pendingId = response.id ?? (this.pending.size === 1 ? [...this.pending.keys()][0] : undefined);

    if (!pending || pendingId === undefined) {
      return;
    }

    this.pending.delete(pendingId);
    clearTimeout(pending.timeout);

    if (!response.ok) {
      const message =
        typeof response.error?.message === "string" ? response.error.message : "External adapter reported an error";
      pending.reject(new ExternalAdapterError(message));
      return;
    }

    pending.resolve(response.result);
  }

  private send(method: ExternalAdapterMethod, params: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    const child = this.child;
    if (!child || child.exitCode !== null) {
      return Promise.reject(new ExternalAdapterError("External adapter process is not running"));
    }

    const id = String(this.nextId++);
    const request = {
      protocolVersion: EXTERNAL_PROTOCOL_VERSION,
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new ExternalAdapterError(`External adapter timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });

      try {
        child.stdin.write(`${JSON.stringify(request)}\n`);
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timeout);
        reject(error instanceof Error ? error : new ExternalAdapterError(String(error)));
      }
    });
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  private killChild(): Promise<void> {
    const child = this.child;
    this.child = undefined;

    if (!child || child.exitCode !== null || child.signalCode !== null) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const grace = setTimeout(() => {
        child.kill("SIGKILL");
      }, DISPOSE_KILL_GRACE_MS);

      child.once("close", () => {
        clearTimeout(grace);
        resolve();
      });

      child.kill("SIGTERM");
    });
  }
}
