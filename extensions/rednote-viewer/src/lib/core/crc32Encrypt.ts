export type DataLike = string | ArrayBuffer | ArrayBufferView | Iterable<number>;

export class CRC32 {
  private static readonly MASK32 = 0xffffffff;
  private static readonly POLY = 0xedb88320;
  private static table: Uint32Array | null = null;

  private static ensureTable(): void {
    if (this.table) return;

    const tbl = new Uint32Array(256);
    for (let d = 0; d < 256; d += 1) {
      let r = d;
      for (let i = 0; i < 8; i += 1) {
        r = (r & 1) !== 0 ? (r >>> 1) ^ this.POLY : r >>> 1;
        r >>>= 0;
      }
      tbl[d] = r >>> 0;
    }
    this.table = tbl;
  }

  private static crc32Core(data: DataLike, stringMode: "js" | "utf8" = "js"): number {
    this.ensureTable();
    const table = this.table!;
    let c = this.MASK32;

    let iterable: Iterable<number>;
    if (typeof data === "string") {
      if (stringMode.toLowerCase() === "utf8") {
        iterable = Buffer.from(data, "utf8");
      } else {
        iterable = Array.from(data, (ch) => ch.charCodeAt(0) & 0xff);
      }
    } else if (ArrayBuffer.isView(data)) {
      iterable = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (data instanceof ArrayBuffer) {
      iterable = new Uint8Array(data);
    } else {
      iterable = data;
    }

    for (const val of iterable) {
      const b = Number(val) & 0xff;
      c = (table[(c ^ b) & 0xff]! ^ (c >>> 8)) >>> 0;
    }

    return c >>> 0;
  }

  private static toSigned32(u: number): number {
    return (u & 0x80000000) !== 0 ? u - 0x100000000 : u;
  }

  static crc32JsInt(data: DataLike, opts: { stringMode?: "js" | "utf8"; signed?: boolean } = {}): number {
    const { stringMode = "js", signed = true } = opts;
    const c = this.crc32Core(data, stringMode);
    const a = this.POLY;
    const u = (this.MASK32 ^ c ^ a) >>> 0;
    return signed ? this.toSigned32(u) : u >>> 0;
  }
}
