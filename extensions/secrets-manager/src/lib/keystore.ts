import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";

const run = promisify(execFile);

export function isItemNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 44;
}

export interface KeyStore {
  getKey(): Promise<Buffer>;
  hasKey(): Promise<boolean>;
}

export class MemoryKeyStore implements KeyStore {
  constructor(private key: Buffer = Buffer.alloc(32, 7)) {}
  async getKey(): Promise<Buffer> {
    return this.key;
  }
  async hasKey(): Promise<boolean> {
    return true;
  }
}

const ACCOUNT = "data-key";

export class KeychainKeyStore implements KeyStore {
  constructor(private service = "raycast-secrets-manager") {}

  async hasKey(): Promise<boolean> {
    try {
      await this.find();
      return true;
    } catch (e) {
      if (isItemNotFound(e)) return false;
      throw e;
    }
  }

  async getKey(): Promise<Buffer> {
    try {
      return await this.find();
    } catch (e) {
      if (isItemNotFound(e)) return this.create();
      throw e;
    }
  }

  private async find(): Promise<Buffer> {
    // -w prints only the password value
    const { stdout } = await run("security", ["find-generic-password", "-s", this.service, "-a", ACCOUNT, "-w"]);
    const buffer = Buffer.from(stdout.trim(), "base64");
    if (buffer.length !== 32) {
      throw new Error("keystore: unexpected key length");
    }
    return buffer;
  }

  private async create(): Promise<Buffer> {
    const key = randomBytes(32);
    await run("security", [
      "add-generic-password",
      "-s",
      this.service,
      "-a",
      ACCOUNT,
      "-w",
      key.toString("base64"),
      "-U", // update if it already exists
    ]);
    return key;
  }
}
