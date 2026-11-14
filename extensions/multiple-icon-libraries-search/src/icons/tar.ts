// Streaming reader for an uncompressed tar archive, enough for npm package tarballs.
// It keeps only the entries `want` accepts, so an 80 MB package never sits in memory whole.

const BLOCK = 512;

interface Entry {
  path: string;
  kind: "file" | "longname" | "pax" | "skip";
  chunks: Buffer[];
  remaining: number;
  padding: number;
}

function readString(header: Buffer, start: number, length: number): string {
  const field = header.subarray(start, start + length);
  const end = field.indexOf(0);
  return field.subarray(0, end === -1 ? length : end).toString("utf8");
}

function readOctal(header: Buffer, start: number, length: number): number {
  const text = readString(header, start, length).trim();
  if (!/^[0-7]*$/.test(text)) throw new Error(`Bad number in tar header: ${text}`);
  return text ? parseInt(text, 8) : 0;
}

function checksumMatches(header: Buffer): boolean {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 0x20 : header[i];
  return sum === readOctal(header, 148, 8);
}

function paxPath(data: Buffer): string | undefined {
  // Records look like "<length> <key>=<value>\n".
  for (const record of data.toString("utf8").split("\n")) {
    const match = /^\d+ path=(.*)$/.exec(record);
    if (match) return match[1];
  }
  return undefined;
}

export class TarExtractor {
  private pending: Buffer = Buffer.alloc(0);
  private entry: Entry | null = null;
  private nextPath: string | undefined;
  private finished = false;

  constructor(
    private readonly want: (path: string) => boolean,
    private readonly onFile: (path: string, data: Buffer) => void,
  ) {}

  write(chunk: Buffer): void {
    this.pending = this.pending.length ? Buffer.concat([this.pending, chunk]) : chunk;
    for (;;) {
      if (this.finished) {
        this.pending = Buffer.alloc(0);
        return;
      }
      if (!this.entry) {
        if (this.pending.length < BLOCK) return;
        const header = this.pending.subarray(0, BLOCK);
        this.pending = this.pending.subarray(BLOCK);
        if (header.every((byte) => byte === 0)) {
          this.finished = true;
          continue;
        }
        this.entry = this.startEntry(header);
        continue;
      }
      const entry = this.entry;
      if (entry.remaining > 0) {
        if (!this.pending.length) return;
        const take = Math.min(entry.remaining, this.pending.length);
        if (entry.kind !== "skip") entry.chunks.push(this.pending.subarray(0, take));
        this.pending = this.pending.subarray(take);
        entry.remaining -= take;
        if (entry.remaining > 0) return;
      }
      if (entry.padding > 0) {
        const take = Math.min(entry.padding, this.pending.length);
        this.pending = this.pending.subarray(take);
        entry.padding -= take;
        if (entry.padding > 0) return;
      }
      this.finishEntry(entry);
      this.entry = null;
    }
  }

  /** Throws when the archive stopped partway through an entry. */
  end(): void {
    if (this.entry || (!this.finished && this.pending.length)) throw new Error("Tar archive is truncated");
  }

  private startEntry(header: Buffer): Entry {
    if (!checksumMatches(header)) throw new Error("Tar header checksum mismatch");
    const size = readOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 0x30);
    const prefix = readString(header, 345, 155);
    const name = readString(header, 0, 100);
    const path = this.nextPath ?? (prefix ? `${prefix}/${name}` : name);
    let kind: Entry["kind"] = "skip";
    if (type === "L") kind = "longname";
    else if (type === "x") kind = "pax";
    else if (type === "0" && this.want(path)) kind = "file";
    if (type !== "L" && type !== "x") this.nextPath = undefined;
    return { path, kind, chunks: [], remaining: size, padding: (BLOCK - (size % BLOCK)) % BLOCK };
  }

  private finishEntry(entry: Entry): void {
    const data = Buffer.concat(entry.chunks);
    if (entry.kind === "longname") this.nextPath = readString(data, 0, data.length);
    else if (entry.kind === "pax") this.nextPath = paxPath(data) ?? this.nextPath;
    else if (entry.kind === "file") this.onFile(entry.path, data);
  }
}
