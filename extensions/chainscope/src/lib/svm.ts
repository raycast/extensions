import { ed25519 } from "@noble/curves/ed25519";
import bs58 from "bs58";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

// No @solana/web3.js or @coral-xyz/anchor: they add 3.5 MB and native `ws`.

export type SvmConfig = { rpc: string; cluster: string };

export type SolTransfer = {
  kind: "SOL" | "SPL";
  from: string;
  to: string;
  amount: string;
  mint?: string;
  decimals?: number;
};
export type SolArg = { name: string; type: string; value: string };
export type SolInstruction = {
  index: number;
  program: string;
  programId: string;
  summary: string;
  source: "parsed" | "anchor IDL" | "raw";
  args: SolArg[];
  accounts: string[];
};
export type SolTxReport = {
  signature: string;
  status: "success" | "failed";
  err: string | null;
  slot: number;
  blockTime: number | null;
  fee: string;
  computeUnits: number | null;
  signer: string | null;
  transfers: SolTransfer[];
  instructions: SolInstruction[];
  programs: { id: string; name: string }[];
  logs: string[];
};
export type SolAccount = { address: string; lamports: string; owner: string; executable: boolean; exists: boolean };

const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "SPL Token",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "SPL Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo",
  Vote111111111111111111111111111111111111111: "Vote",
  Stake11111111111111111111111111111111111111: "Stake",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter Aggregator v6",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpools",
};

function programName(id: string): string {
  return KNOWN_PROGRAMS[id] ?? `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function lamportsToSol(lamports: number | string): string {
  return (Number(lamports) / 1e9).toString();
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, 400));
      continue;
    }
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  }
  throw new Error("rate limited");
}

function sha256(...parts: Buffer[]): Buffer {
  const h = createHash("sha256");
  for (const p of parts) h.update(p);
  return h.digest();
}

function onCurve(bytes: Buffer): boolean {
  try {
    ed25519.ExtendedPoint.fromHex(bytes);
    return true;
  } catch {
    return false;
  }
}

const PDA_MARKER = Buffer.from("ProgramDerivedAddress");

function findProgramAddress(seeds: Buffer[], programId: string): string {
  const pid = Buffer.from(bs58.decode(programId));
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(...seeds, Buffer.from([bump]), pid, PDA_MARKER);
    if (!onCurve(hash)) return bs58.encode(hash);
  }
  throw new Error("no PDA");
}

function createWithSeed(base: string, seed: string, programId: string): string {
  return bs58.encode(sha256(Buffer.from(bs58.decode(base)), Buffer.from(seed), Buffer.from(bs58.decode(programId))));
}

class BorshReader {
  off = 0;
  constructor(private b: Buffer) {}
  private take(n: number): Buffer {
    const s = this.b.subarray(this.off, this.off + n);
    if (s.length < n) throw new RangeError("borsh overrun");
    this.off += n;
    return s;
  }
  u8() {
    return this.take(1).readUInt8(0);
  }
  i8() {
    return this.take(1).readInt8(0);
  }
  u16() {
    return this.take(2).readUInt16LE(0);
  }
  i16() {
    return this.take(2).readInt16LE(0);
  }
  u32() {
    return this.take(4).readUInt32LE(0);
  }
  i32() {
    return this.take(4).readInt32LE(0);
  }
  f32() {
    return this.take(4).readFloatLE(0);
  }
  f64() {
    return this.take(8).readDoubleLE(0);
  }
  uBig(n: number): bigint {
    const s = this.take(n);
    let v = 0n;
    for (let i = 0; i < n; i++) v |= BigInt(s[i]) << (8n * BigInt(i));
    return v;
  }
  iBig(n: number): bigint {
    const v = this.uBig(n);
    const bits = BigInt(n * 8);
    return v >= 1n << (bits - 1n) ? v - (1n << bits) : v;
  }
  bool() {
    return this.u8() !== 0;
  }
  pubkey() {
    return bs58.encode(this.take(32));
  }
  string() {
    return this.take(this.u32()).toString("utf8");
  }
}

type IdlType = string | { vec: IdlType } | { option: IdlType } | { array: [IdlType, number] } | { defined: unknown };
type IdlField = { name: string; type: IdlType };
type IdlVariant = { name: string; fields?: (IdlType | IdlField)[] };
type IdlTypeDef = { name: string; type: { kind: string; fields?: IdlField[]; variants?: IdlVariant[] } };
type IdlIx = { name: string; discriminator?: number[]; args?: IdlField[] };
type Idl = { name?: string; metadata?: { name?: string }; instructions?: IdlIx[]; types?: IdlTypeDef[] };

function definedName(t: unknown): string | null {
  if (t && typeof t === "object" && "defined" in t) {
    const d = (t as { defined: unknown }).defined;
    return typeof d === "string" ? d : ((d as { name?: string })?.name ?? null);
  }
  return null;
}

function decodeType(r: BorshReader, type: IdlType, idl: Idl): unknown {
  if (typeof type === "string") {
    switch (type) {
      case "bool":
        return r.bool();
      case "u8":
        return r.u8();
      case "i8":
        return r.i8();
      case "u16":
        return r.u16();
      case "i16":
        return r.i16();
      case "u32":
        return r.u32();
      case "i32":
        return r.i32();
      case "f32":
        return r.f32();
      case "f64":
        return r.f64();
      case "u64":
        return r.uBig(8).toString();
      case "i64":
        return r.iBig(8).toString();
      case "u128":
        return r.uBig(16).toString();
      case "i128":
        return r.iBig(16).toString();
      case "u256":
        return r.uBig(32).toString();
      case "i256":
        return r.iBig(32).toString();
      case "bytes": {
        const n = r.u32();
        return `0x${Buffer.from(Array.from({ length: n }, () => r.u8())).toString("hex")}`;
      }
      case "string":
        return r.string();
      case "publicKey":
      case "pubkey":
        return r.pubkey();
      default:
        throw new Error(`type ${type}`);
    }
  }
  if ("vec" in type) {
    const n = r.u32();
    return Array.from({ length: n }, () => decodeType(r, type.vec, idl));
  }
  if ("option" in type) {
    return r.u8() ? decodeType(r, type.option, idl) : null;
  }
  if ("array" in type) {
    const [el, n] = type.array;
    return Array.from({ length: n }, () => decodeType(r, el, idl));
  }
  const dn = definedName(type);
  if (dn) {
    const td = (idl.types ?? []).find((x) => x.name === dn);
    if (td?.type.kind === "struct" && td.type.fields) {
      const o: Record<string, unknown> = {};
      for (const f of td.type.fields) o[f.name] = decodeType(r, f.type, idl);
      return o;
    }
    if (td?.type.kind === "enum" && td.type.variants) {
      const v = td.type.variants[r.u8()];
      if (!v) throw new Error("enum tag");
      if (!v.fields?.length) return { [v.name]: {} };
      const named = typeof v.fields[0] === "object" && "name" in (v.fields[0] as object);
      if (named) {
        const o: Record<string, unknown> = {};
        for (const f of v.fields as IdlField[]) o[f.name] = decodeType(r, f.type, idl);
        return { [v.name]: o };
      }
      return { [v.name]: (v.fields as IdlType[]).map((ft) => decodeType(r, ft, idl)) };
    }
  }
  throw new Error("unsupported type");
}

function stringifySol(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "bigint" || typeof v === "number" || typeof v === "boolean" || typeof v === "string")
    return String(v);
  if (Array.isArray(v)) return `[${v.map(stringifySol).join(", ")}]`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toArgs(data: Record<string, unknown>): SolArg[] {
  return Object.entries(data).map(([name, value]) => ({ name, type: "", value: stringifySol(value) }));
}

function snake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function discriminatorOf(ix: IdlIx): Buffer {
  if (Array.isArray(ix.discriminator)) return Buffer.from(ix.discriminator);
  return sha256(Buffer.from(`global:${snake(ix.name)}`)).subarray(0, 8);
}

const idlCache = new Map<string, Promise<Idl | null>>();

function fetchIdl(rpcUrl: string, programId: string): Promise<Idl | null> {
  const cached = idlCache.get(programId);
  if (cached) return cached;
  const p = (async () => {
    try {
      const base = findProgramAddress([], programId);
      const addr = createWithSeed(base, "anchor:idl", programId);
      const info = await rpc<{ value?: { data?: [string, string] } } | null>(rpcUrl, "getAccountInfo", [
        addr,
        { encoding: "base64" },
      ]);
      const data = info?.value?.data?.[0];
      if (!data) return null;
      const buf = Buffer.from(data, "base64");
      if (buf.length < 44) return null;
      const len = buf.readUInt32LE(40);
      return JSON.parse(inflateSync(buf.subarray(44, 44 + len)).toString("utf8")) as Idl;
    } catch {
      return null;
    }
  })();
  idlCache.set(programId, p);
  return p;
}

async function anchorDecode(
  rpcUrl: string,
  programId: string,
  dataBase58: string,
): Promise<{ name: string; args: SolArg[] } | null> {
  const idl = await fetchIdl(rpcUrl, programId);
  if (!idl) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(bs58.decode(dataBase58));
  } catch {
    return null;
  }
  const disc = buf.subarray(0, 8);
  const ix = (idl.instructions ?? []).find((i) => discriminatorOf(i).equals(disc));
  if (!ix) return null;
  let args: SolArg[] = [];
  try {
    const r = new BorshReader(buf.subarray(8));
    const obj: Record<string, unknown> = {};
    for (const a of ix.args ?? []) obj[a.name] = decodeType(r, a.type, idl);
    args = toArgs(obj);
  } catch {
    // arg layout unsupported — keep the resolved instruction name
  }
  return { name: ix.name, args };
}

type RawIx = {
  program?: string;
  programId: string;
  parsed?: { type?: string; info?: Record<string, unknown> };
  accounts?: string[];
  data?: string;
};

type TokenBalance = { accountIndex: number; mint: string; uiTokenAmount: { decimals: number } };
type TokenInfo = { mint: string; decimals: number };

// Plain SPL transfers omit the mint and decimals; the token balances have them.
export function tokenInfoByAccount(keys: { pubkey: string }[], balances: TokenBalance[]): Map<string, TokenInfo> {
  const info = new Map<string, TokenInfo>();
  for (const b of balances) {
    const key = keys[b.accountIndex]?.pubkey;
    if (key) info.set(key, { mint: b.mint, decimals: b.uiTokenAmount.decimals });
  }
  return info;
}

function formatTokenAmount(raw: string, decimals: number): string {
  const digits = raw.padStart(decimals + 1, "0");
  const split = digits.length - decimals;
  const fraction = digits.slice(split).replace(/0+$/, "");
  return fraction ? `${digits.slice(0, split)}.${fraction}` : digits.slice(0, split);
}

export function collectTransfers(instrs: RawIx[], tokens: Map<string, TokenInfo>): SolTransfer[] {
  const out: SolTransfer[] = [];
  for (const ix of instrs) {
    if (!ix.parsed) continue;
    const { program } = ix;
    const { type, info = {} } = ix.parsed;
    if (program === "system" && type === "transfer") {
      out.push({
        kind: "SOL",
        from: String(info.source),
        to: String(info.destination),
        amount: lamportsToSol(info.lamports as number),
      });
    } else if (program === "spl-token" || program === "spl-token-2022") {
      if (type === "transferChecked") {
        const ta = info.tokenAmount as { amount: string; decimals: number; uiAmountString?: string };
        out.push({
          kind: "SPL",
          from: String(info.source),
          to: String(info.destination),
          amount: ta.uiAmountString ?? formatTokenAmount(ta.amount, ta.decimals),
          mint: String(info.mint),
          decimals: ta.decimals,
        });
      } else if (type === "transfer") {
        const token = tokens.get(String(info.source)) ?? tokens.get(String(info.destination));
        const raw = String(info.amount);
        out.push({
          kind: "SPL",
          from: String(info.source),
          to: String(info.destination),
          amount: token ? formatTokenAmount(raw, token.decimals) : raw,
          mint: token?.mint,
          decimals: token?.decimals,
        });
      }
    }
  }
  return out;
}

type RawTx = {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    fee: number;
    computeUnitsConsumed?: number;
    logMessages?: string[];
    innerInstructions?: { instructions: RawIx[] }[];
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
  transaction: { message: { instructions: RawIx[]; accountKeys: { pubkey: string; signer: boolean }[] } };
};

export async function analyzeSolanaTransaction(cfg: SvmConfig, signature: string): Promise<SolTxReport | null> {
  const tx = await rpc<RawTx | null>(cfg.rpc, "getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 1, commitment: "confirmed" },
  ]);
  if (!tx) return null;

  const meta = tx.meta;
  const message = tx.transaction.message;
  const top = message.instructions ?? [];
  const inner = (meta?.innerInstructions ?? []).flatMap((g) => g.instructions);

  const tokens = tokenInfoByAccount(message.accountKeys, [
    ...(meta?.preTokenBalances ?? []),
    ...(meta?.postTokenBalances ?? []),
  ]);
  const transfers = collectTransfers([...top, ...inner], tokens);

  const instructions: SolInstruction[] = [];
  for (let i = 0; i < top.length; i++) {
    const ix = top[i];
    if (ix.parsed) {
      const args = toArgs(ix.parsed.info ?? {});
      instructions.push({
        index: i,
        program: ix.program ?? programName(ix.programId),
        programId: ix.programId,
        summary: ix.parsed.type ?? "instruction",
        source: "parsed",
        args,
        accounts: [],
      });
    } else {
      const decoded = ix.data ? await anchorDecode(cfg.rpc, ix.programId, ix.data) : null;
      instructions.push({
        index: i,
        program: programName(ix.programId),
        programId: ix.programId,
        summary: decoded?.name ?? "unknown instruction",
        source: decoded ? "anchor IDL" : "raw",
        args: decoded?.args ?? [],
        accounts: ix.accounts ?? [],
      });
    }
  }

  const programIds = Array.from(new Set([...top, ...inner].map((ix) => ix.programId)));
  return {
    signature,
    status: meta?.err ? "failed" : "success",
    err: meta?.err ? JSON.stringify(meta.err) : null,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    fee: lamportsToSol(meta?.fee ?? 0),
    computeUnits: meta?.computeUnitsConsumed ?? null,
    signer: message.accountKeys.find((k) => k.signer)?.pubkey ?? null,
    transfers,
    instructions,
    programs: programIds.map((id) => ({ id, name: programName(id) })),
    logs: meta?.logMessages ?? [],
  };
}

export async function analyzeSolanaAddress(cfg: SvmConfig, address: string): Promise<SolAccount | null> {
  try {
    bs58.decode(address);
  } catch {
    return null;
  }
  const info = await rpc<{ value: { lamports: number; owner: string; executable: boolean } | null }>(
    cfg.rpc,
    "getAccountInfo",
    [address, { encoding: "base64" }],
  );
  if (!info?.value) return { address, lamports: "0", owner: "", executable: false, exists: false };
  return {
    address,
    lamports: lamportsToSol(info.value.lamports),
    owner: info.value.owner,
    executable: info.value.executable,
    exists: true,
  };
}
