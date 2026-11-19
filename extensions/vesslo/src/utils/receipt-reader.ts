import { constants, promises as fs } from "fs";
import { homedir } from "os";
import { dirname, isAbsolute, join, normalize, parse } from "path";
import {
  HandoffReceipt,
  MAX_RECEIPT_BYTES,
  MalformedReceiptError,
  isExpiredReceipt,
  parseReceiptEnvelope,
  receiptTransitionReason,
  ReceiptReadState,
  initialReceiptState,
} from "./receipt-contract";

export const RECEIPTS_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Vesslo",
  "raycast_receipts.json",
);
export interface ReceiptMetadata {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  nlink: number;
  mode: number;
  uid: number;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}
export interface ReceiptFileHandle {
  stat(): Promise<ReceiptMetadata>;
  read(
    buffer: Buffer,
    offset: number,
    length: number,
    position: number,
  ): Promise<{ bytesRead: number }>;
  close(): Promise<void>;
}
export interface ReceiptFileSystem {
  lstat(path: string): Promise<ReceiptMetadata>;
  open(path: string, flags: number): Promise<ReceiptFileHandle>;
  uid: number;
}
const nativeFileSystem: ReceiptFileSystem = {
  lstat: (path) => fs.lstat(path),
  open: (path, flags) => fs.open(path, flags),
  uid: process.getuid?.() ?? -1,
};
class UnsafeReceiptFileError extends Error {}
class ReceiptConflictError extends Error {}
function signature(stat: ReceiptMetadata) {
  return [
    stat.dev,
    stat.ino,
    stat.size,
    stat.mtimeMs,
    stat.ctimeMs,
    stat.nlink,
    stat.mode,
    stat.uid,
  ].join(":");
}
function code(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? error.code
    : undefined;
}
function errorState(
  error: unknown,
): Pick<ReceiptReadState, "status" | "reason"> {
  if (error instanceof ReceiptConflictError)
    return { status: "conflict", reason: error.message };
  if (error instanceof MalformedReceiptError)
    return { status: "malformed", reason: error.message };
  if (error instanceof UnsafeReceiptFileError || code(error) === "ELOOP")
    return {
      status: "unsafeFile",
      reason:
        "Receipt path is not a private regular file with safe parent directories.",
    };
  if (code(error) === "ENOENT" || code(error) === "ENOTDIR")
    return {
      status: "missing",
      reason:
        "No receipt file is available. Opening a request does not prove that Vesslo accepted it.",
    };
  if (code(error) === "EACCES" || code(error) === "EPERM")
    return {
      status: "permissionDenied",
      reason:
        "Receipt file access was denied. Cached results are not current confirmation.",
    };
  return {
    status: "ioError",
    reason:
      "Receipt file could not be read consistently. Cached results are not current confirmation.",
  };
}
export class HandoffReceiptReader {
  private readonly path: string;
  private readonly fileSystem: ReceiptFileSystem;
  private readonly now: () => number;
  private state = initialReceiptState();
  private cache: { signature: string; receipts: HandoffReceipt[] } | null =
    null;
  private evidence = new Map<string, HandoffReceipt>();
  private generation = 0;
  private disposed = false;
  private pending: Promise<ReceiptReadState> | null = null;
  constructor(
    options: {
      path?: string;
      fileSystem?: ReceiptFileSystem;
      now?: () => number;
    } = {},
  ) {
    this.path = options.path ?? RECEIPTS_PATH;
    this.fileSystem = options.fileSystem ?? nativeFileSystem;
    this.now = options.now ?? Date.now;
  }
  getState() {
    return this.state;
  }
  dispose() {
    this.disposed = true;
    this.generation += 1;
  }
  read(options: { force?: boolean } = {}): Promise<ReceiptReadState> {
    if (this.disposed) return Promise.resolve(this.state);
    const generation = ++this.generation;
    const pending = this.readStable(options.force === true)
      .then((snapshot) => {
        if (this.disposed) return this.state;
        if (generation !== this.generation) return this.pending ?? this.state;
        const now = this.now();
        const evidence = new Map(this.evidence);
        for (const receipt of snapshot.receipts) {
          const id = receipt.request.requestId.toLowerCase();
          const previous = evidence.get(id);
          const conflict = previous
            ? receiptTransitionReason(previous, receipt)
            : null;
          if (conflict) throw new ReceiptConflictError(conflict);
          evidence.set(id, receipt);
        }
        if (evidence.size > 256)
          throw new ReceiptConflictError(
            "Receipt observation limit reached. Reopen this view to read a new history snapshot.",
          );
        this.evidence = evidence;
        this.cache = snapshot;
        this.state = {
          status: "ready",
          receipts: snapshot.receipts.filter(
            (receipt) => !isExpiredReceipt(receipt, now),
          ),
          expiredReceipts: snapshot.receipts.filter((receipt) =>
            isExpiredReceipt(receipt, now),
          ),
          reason: null,
          checkedAt: now,
        };
        return this.state;
      })
      .catch((error: unknown) => {
        if (this.disposed) return this.state;
        if (generation !== this.generation) return this.pending ?? this.state;
        this.cache = null;
        this.state = {
          ...this.state,
          ...errorState(error),
          checkedAt: this.now(),
        };
        return this.state;
      });
    this.pending = pending;
    return pending;
  }
  private validateFile(stat: ReceiptMetadata) {
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      stat.uid !== this.fileSystem.uid ||
      (stat.mode & 0o077) !== 0
    )
      throw new UnsafeReceiptFileError();
    if (
      !Number.isSafeInteger(stat.size) ||
      stat.size < 0 ||
      stat.size > MAX_RECEIPT_BYTES
    )
      throw new MalformedReceiptError("Receipt file exceeds its bounded size.");
  }
  private async parents(): Promise<Array<{ path: string; signature: string }>> {
    if (
      !isAbsolute(this.path) ||
      normalize(this.path) !== this.path ||
      this.path.includes("\0")
    )
      throw new UnsafeReceiptFileError();
    const paths: string[] = [];
    let parent = dirname(this.path);
    while (true) {
      paths.unshift(parent);
      if (parent === parse(parent).root) break;
      parent = dirname(parent);
    }
    const bindings = [];
    for (const path of paths) {
      const stat = await this.fileSystem.lstat(path);
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        (stat.uid !== 0 && stat.uid !== this.fileSystem.uid) ||
        (stat.mode & 0o022) !== 0
      )
        throw new UnsafeReceiptFileError();
      bindings.push({ path, signature: signature(stat) });
    }
    return bindings;
  }
  private async readStable(
    force: boolean,
  ): Promise<{ signature: string; receipts: HandoffReceipt[] }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parents = await this.parents();
      const before = await this.fileSystem.lstat(this.path);
      this.validateFile(before);
      const beforeSignature = signature(before);
      let receipts: HandoffReceipt[];
      if (!force && this.cache?.signature === beforeSignature)
        receipts = this.cache.receipts;
      else {
        const handle = await this.fileSystem.open(
          this.path,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
        try {
          const opened = await handle.stat();
          this.validateFile(opened);
          if (signature(opened) !== beforeSignature) continue;
          const buffer = Buffer.alloc(MAX_RECEIPT_BYTES + 1);
          let length = 0;
          while (length < buffer.length) {
            const { bytesRead } = await handle.read(
              buffer,
              length,
              buffer.length - length,
              length,
            );
            if (!bytesRead) break;
            length += bytesRead;
          }
          if (length > MAX_RECEIPT_BYTES)
            throw new MalformedReceiptError("Receipt file exceeds 4 MiB.");
          if (signature(await handle.stat()) !== beforeSignature) continue;
          receipts = parseReceiptEnvelope(
            new TextDecoder("utf-8", { fatal: true }).decode(
              buffer.subarray(0, length),
            ),
            this.now(),
          );
        } finally {
          await handle.close();
        }
      }
      const after = await this.fileSystem.lstat(this.path);
      this.validateFile(after);
      if (signature(after) !== beforeSignature) continue;
      let parentsStable = true;
      for (const parent of parents)
        if (
          signature(await this.fileSystem.lstat(parent.path)) !==
          parent.signature
        )
          parentsStable = false;
      if (parentsStable) return { signature: beforeSignature, receipts };
    }
    throw new Error("Receipt file changed during bounded read.");
  }
}

export { initialReceiptState } from "./receipt-contract";
export type { ReceiptReadState } from "./receipt-contract";
