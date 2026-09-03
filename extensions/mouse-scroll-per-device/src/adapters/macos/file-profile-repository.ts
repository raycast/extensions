import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  OperationResult,
  ProfileDocument,
  ScrollProfile,
  validateProfile,
  validateProfileDocument,
} from "../../domain/models";
import { ProfileRepository } from "../../ports/profile-repository";

export interface ProfileLockOptions {
  retryMilliseconds?: number;
  timeoutMilliseconds?: number;
  staleMilliseconds?: number;
}

interface LockOwner {
  pid: number;
  createdAt: number;
}

export class FileProfileRepository implements ProfileRepository {
  private readonly lockPath: string;
  private readonly retryMilliseconds: number;
  private readonly timeoutMilliseconds: number;
  private readonly staleMilliseconds: number;

  constructor(
    private readonly path: string,
    options: ProfileLockOptions = {},
  ) {
    this.lockPath = `${path}.lock`;
    this.retryMilliseconds = options.retryMilliseconds ?? 10;
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? 2_000;
    this.staleMilliseconds = options.staleMilliseconds ?? 30_000;
  }

  async load(): Promise<OperationResult<ProfileDocument>> {
    try {
      const raw = await readFile(this.path, "utf8");
      const parsed: unknown = JSON.parse(raw);
      const invalid = validateProfileDocument(parsed);
      if (invalid) throw new Error(invalid);
      return { status: "succeeded", value: parsed as ProfileDocument };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { status: "succeeded", value: { version: 1, profiles: {} } };
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  async save(document: ProfileDocument): Promise<OperationResult<void>> {
    const invalid = validateProfileDocument(document);
    if (invalid) return { status: "failed", error: invalid };
    return this.withLock(() => this.saveUnlocked(document));
  }

  async upsert(profileKey: string, profile: ScrollProfile): Promise<OperationResult<void>> {
    if (!profileKey) return { status: "failed", error: "Profile key is required." };
    const invalid = validateProfile(profile);
    if (invalid) return { status: "failed", error: invalid };
    return this.withLock(async () => {
      const current = await this.load();
      if (current.status !== "succeeded") return current;
      return this.saveUnlocked({ ...current.value, profiles: { ...current.value.profiles, [profileKey]: profile } });
    });
  }

  private async saveUnlocked(document: ProfileDocument): Promise<OperationResult<void>> {
    try {
      await mkdir(dirname(this.path), { recursive: true });
      const temporary = `${this.path}.tmp-${process.pid}-${Date.now()}`;
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
      return { status: "succeeded", value: undefined, receipt: { detail: `Atomic write: ${this.path}` } };
    } catch (error) {
      return { status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async withLock<T>(operation: () => Promise<OperationResult<T>>): Promise<OperationResult<T>> {
    const lock = await this.acquireLock();
    if (lock.status !== "succeeded") return lock;
    try {
      return await operation();
    } finally {
      await rm(this.lockPath, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async acquireLock(): Promise<OperationResult<void>> {
    await mkdir(dirname(this.path), { recursive: true });
    const deadline = Date.now() + this.timeoutMilliseconds;
    while (Date.now() <= deadline) {
      try {
        await mkdir(this.lockPath, { mode: 0o700 });
        await writeFile(
          `${this.lockPath}/owner.json`,
          `${JSON.stringify({ pid: process.pid, createdAt: Date.now() } satisfies LockOwner)}\n`,
          { mode: 0o600 },
        );
        return { status: "succeeded", value: undefined };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          return { status: "failed", error: error instanceof Error ? error.message : String(error) };
        }
        await this.recoverStaleLock();
        await new Promise((resolve) => setTimeout(resolve, this.retryMilliseconds));
      }
    }
    return { status: "failed", error: "Timed out acquiring profile lock." };
  }

  private async recoverStaleLock(): Promise<void> {
    const ownerPath = `${this.lockPath}/owner.json`;
    let owner: LockOwner | undefined;
    try {
      const parsed: unknown = JSON.parse(await readFile(ownerPath, "utf8"));
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as LockOwner).pid === "number" &&
        typeof (parsed as LockOwner).createdAt === "number"
      ) {
        owner = parsed as LockOwner;
      }
    } catch {
      // A creator that crashed before writing owner.json is considered only after the stale interval.
    }
    let age: number;
    try {
      age = Date.now() - (owner?.createdAt ?? (await stat(this.lockPath)).mtimeMs);
    } catch {
      return;
    }
    if (age < this.staleMilliseconds || (owner && this.processIsAlive(owner.pid))) return;
    const quarantine = `${this.lockPath}.stale-${process.pid}-${Date.now()}`;
    try {
      await rename(this.lockPath, quarantine);
      await rm(quarantine, { recursive: true, force: true });
    } catch {
      // Another contender released or recovered the lock; retry acquisition instead of touching its state.
    }
  }

  private processIsAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === "EPERM";
    }
  }
}
