// No @raycast/api here, so the smoke tests can run it.
import {
  BaseError,
  createPublicClient,
  decodeAbiParameters,
  decodeErrorResult,
  decodeEventLog,
  decodeFunctionData,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  slice,
  toEventSelector,
  toFunctionSelector,
  zeroAddress,
  type Abi,
  type AbiEvent,
  type AbiFunction,
  type Address,
  type Hex,
  type SignedAuthorization,
} from "viem";
import type { AbiError } from "abitype";
import { normalize } from "viem/ens";
import { recoverAuthorizationAddress } from "viem/utils";
import { getChain, lookupChains } from "./chains";

// EIP-1967 storage slots (keccak256("eip1967.proxy.{implementation,beacon}") - 1).
const EIP1967_IMPL_SLOT: Hex = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const EIP1967_BEACON_SLOT: Hex = "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";
// Legacy OpenZeppelin (pre-1967) implementation slot: keccak256("org.zeppelinos.proxy.implementation").
const OZ_LEGACY_IMPL_SLOT: Hex = "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3";
const BEACON_ABI = [parseAbiItem("function implementation() view returns (address)")];
const SAFE_ABI = [
  parseAbiItem("function getOwners() view returns (address[])"),
  parseAbiItem("function getThreshold() view returns (uint256)"),
  parseAbiItem("function VERSION() view returns (string)"),
  parseAbiItem("function nonce() view returns (uint256)"),
];

// Standard signatures with named params, tried before the signature DB.
const COMMON_ABI = parseAbi([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function setApprovalForAll(address operator, bool approved)",
  "function deposit()",
  "function withdraw(uint256 amount)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
]);

export type DecodeConfig = {
  chainId: number;
  etherscanApiKey?: string;
  sources?: { sourcify?: boolean; blockscout?: boolean; signatureDb?: boolean }; // all on unless false
  sourcifyUrl?: string;
  signatureDbUrl?: string;
};

export type DecodedArg = { name: string; type: string; value: string; nested?: DecodedCall[] };

export type DecodedCall = {
  functionName: string;
  signature: string;
  selector: Hex;
  args: DecodedArg[];
  source: string;
  guess: boolean; // true when resolved via signature DB (collisions possible)
  candidates?: string[];
  batch?: InnerTx[];
};

export type InnerTx = {
  index: number;
  operation: "call" | "delegatecall";
  to: Address;
  value: string; // wei, decimal string
  data: Hex;
  decoded: DecodedCall | null;
};

export type DecodedLog = {
  address: Address;
  eventName: string;
  signature: string;
  args: DecodedArg[];
  source: string;
  guess: boolean;
  topic0: Hex | null;
};

export type ProxyInfo = { implementation: Address; kind: string };

export type MultisigInfo = {
  kind: string;
  owners: Address[];
  threshold: number;
  version?: string;
  nonce?: string;
};

export type ChainPresence = { chainId: number; name: string; multisig: MultisigInfo | null; delegate: Address | null };

// A null delegate removes the delegation.
export type Authorization = { authority: Address | null; delegate: Address | null; chainId: number };

export type DecodedError = {
  kind: "Error" | "Panic" | "custom" | "raw";
  name: string;
  signature: string;
  args: DecodedArg[];
  raw: Hex;
};

export type TxInfo = { hash: Hex; from: Address; to: Address | null; value: bigint; input: Hex };

export type TxReport = {
  chainId: number;
  hash: Hex;
  from: Address;
  to: Address | null;
  value: bigint;
  input: Hex;
  status: "success" | "reverted" | null;
  gasUsed: bigint | null;
  effectiveGasPrice: bigint | null;
  blockNumber: bigint | null;
  timestamp: number | null;
  decoded: DecodedCall | null;
  proxy: ProxyInfo | null;
  logs: DecodedLog[];
  revert: DecodedError | null;
  authorizations: Authorization[];
};

function makeClient(chainId: number) {
  const cfg = getChain(chainId);
  return createPublicClient({ chain: cfg.chain, transport: http(cfg.defaultRpc) });
}

type Client = ReturnType<typeof makeClient>;

// Caches ABIs across a tx's input and logs.
type Ctx = {
  cfg: DecodeConfig;
  client: Client;
  abi: Map<string, Promise<{ abi: Abi; source: string } | null>>;
  proxy: Map<string, Promise<ProxyInfo | null>>;
  delegation: Map<string, Promise<Address | null>>;
  selectors: Map<string, Promise<string[]>>;
  events: Map<string, Promise<string[]>>;
};

function makeCtx(cfg: DecodeConfig): Ctx {
  return {
    cfg,
    client: makeClient(cfg.chainId),
    abi: new Map(),
    proxy: new Map(),
    delegation: new Map(),
    selectors: new Map(),
    events: new Map(),
  };
}

// EIP-7702: a delegated wallet's code is 0xef0100 followed by the delegate's address.
export function parseDelegation(code: Hex | undefined): Address | null {
  if (!code || !/^0xef0100[0-9a-f]{40}$/i.test(code)) return null;
  return getAddress(`0x${code.slice(8)}`);
}

function readDelegation(ctx: Ctx, address: Address): Promise<Address | null> {
  const key = address.toLowerCase();
  const cached = ctx.delegation.get(key);
  if (cached) return cached;
  const p = ctx.client
    .getCode({ address })
    .then(parseDelegation)
    .catch(() => null);
  ctx.delegation.set(key, p);
  return p;
}

function addressFromSlot(raw: Hex | undefined): Address | null {
  if (!raw || raw.length < 42) return null;
  const candidate = `0x${raw.slice(-40)}`;
  if (/^0x0{40}$/i.test(candidate)) return null;
  return getAddress(candidate);
}

function stringifyValue(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(stringifyValue).join(", ")}]`;
  if (v && typeof v === "object") {
    return `{ ${Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${stringifyValue(val)}`)
      .join(", ")} }`;
  }
  return String(v);
}

// Split a comma-separated type list at top level (tuples keep their inner commas).
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function looksLikeCalldata(data: Hex): boolean {
  const bytes = (data.length - 2) / 2;
  return bytes >= 4 && (bytes - 4) % 32 === 0;
}

// Bounded: unbounded lookups get rate limited (429), leaving logs undecoded.
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Overloads share a name and can share an argument count, so match by selector.
function matchFunction(abi: Abi, data: Hex): AbiFunction | undefined {
  const selector = slice(data, 0, 4).toLowerCase();
  return abi.find((i): i is AbiFunction => i.type === "function" && toFunctionSelector(i) === selector);
}

export function matchEvent(abi: Abi, topic0: Hex | undefined): AbiEvent | undefined {
  return abi.find((i): i is AbiEvent => i.type === "event" && toEventSelector(i) === topic0);
}

function buildCall(
  data: Hex,
  fn: AbiFunction | undefined,
  functionName: string,
  args: DecodedArg[],
  source: string,
  guess: boolean,
  candidates?: string[],
): DecodedCall {
  const inputs = fn?.inputs ?? [];
  const signature = fn ? `${functionName}(${inputs.map((p) => p.type).join(",")})` : functionName;
  return { functionName, signature, selector: slice(data, 0, 4), args, source, guess, candidates };
}

function readProxy(ctx: Ctx, address: Address): Promise<ProxyInfo | null> {
  const key = address.toLowerCase();
  const cached = ctx.proxy.get(key);
  if (cached) return cached;
  const p = (async () => {
    for (const [slot, kind] of [
      [EIP1967_IMPL_SLOT, "EIP-1967"],
      [OZ_LEGACY_IMPL_SLOT, "OpenZeppelin (legacy)"],
    ] as const) {
      const impl = addressFromSlot(await ctx.client.getStorageAt({ address, slot }));
      if (impl) return { implementation: impl, kind };
    }
    const beacon = addressFromSlot(await ctx.client.getStorageAt({ address, slot: EIP1967_BEACON_SLOT }));
    if (beacon) {
      try {
        const impl = await ctx.client.readContract({
          address: beacon,
          abi: BEACON_ABI,
          functionName: "implementation",
        });
        if (impl) return { implementation: getAddress(impl as Address), kind: "EIP-1967 beacon" };
      } catch {
        // beacon without a standard implementation() getter
      }
    }
    return null;
    // An RPC failure means unknown, not a failed decode.
  })().catch(() => null);
  ctx.proxy.set(key, p);
  return p;
}

async function fetchAbiEtherscan(cfg: DecodeConfig, address: Address): Promise<Abi | null> {
  if (!cfg.etherscanApiKey) return null;
  const url = `https://api.etherscan.io/v2/api?chainid=${cfg.chainId}&module=contract&action=getabi&address=${address}&apikey=${cfg.etherscanApiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { status: string; result: string };
    if (json.status !== "1") return null;
    return JSON.parse(json.result) as Abi;
  } catch {
    return null;
  }
}

async function fetchAbiSourcify(cfg: DecodeConfig, address: Address): Promise<Abi | null> {
  const base = cfg.sourcifyUrl ?? "https://sourcify.dev/server";
  try {
    const res = await fetch(`${base}/v2/contract/${cfg.chainId}/${getAddress(address)}?fields=abi`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const { abi } = (await res.json()) as { abi?: Abi };
    return abi?.length ? abi : null;
  } catch {
    return null;
  }
}

async function fetchAbiBlockscout(chainId: number, address: Address): Promise<Abi | null> {
  const base = getChain(chainId).blockscout;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/v2/smart-contracts/${getAddress(address)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const { abi } = (await res.json()) as { abi?: Abi };
    return abi?.length ? abi : null;
  } catch {
    return null;
  }
}

function resolveAbi(ctx: Ctx, address: Address): Promise<{ abi: Abi; source: string } | null> {
  const key = address.toLowerCase();
  const cached = ctx.abi.get(key);
  if (cached) return cached;
  const p = (async () => {
    const fromEtherscan = await fetchAbiEtherscan(ctx.cfg, address);
    if (fromEtherscan) return { abi: fromEtherscan, source: "Etherscan" };
    const { sourcify, blockscout } = ctx.cfg.sources ?? {};
    const fromSourcify = sourcify === false ? null : await fetchAbiSourcify(ctx.cfg, address);
    if (fromSourcify) return { abi: fromSourcify, source: "Sourcify" };
    const fromBlockscout = blockscout === false ? null : await fetchAbiBlockscout(ctx.cfg.chainId, address);
    if (fromBlockscout) return { abi: fromBlockscout, source: "Blockscout" };
    return null;
  })();
  ctx.abi.set(key, p);
  return p;
}

async function effectiveAbi(ctx: Ctx, address: Address): Promise<{ abi: Abi; source: string } | null> {
  const proxy = await readProxy(ctx, address);
  if (proxy) return resolveAbi(ctx, proxy.implementation);
  const own = await resolveAbi(ctx, address);
  if (own) return own;
  const delegate = await readDelegation(ctx, address);
  if (!delegate) return null;
  const delegateProxy = await readProxy(ctx, delegate);
  const abi = await resolveAbi(ctx, delegateProxy?.implementation ?? delegate);
  return abi && { ...abi, source: `${abi.source} · EIP-7702 delegate` };
}

function lookupSelector(ctx: Ctx, selector: Hex): Promise<string[]> {
  const cached = ctx.selectors.get(selector);
  if (cached) return cached;
  const p = lookupSignatureDb(ctx.cfg, "function", selector);
  ctx.selectors.set(selector, p);
  return p;
}

function lookupEvent(ctx: Ctx, topic0: Hex): Promise<string[]> {
  const cached = ctx.events.get(topic0);
  if (cached) return cached;
  const p = lookupSignatureDb(ctx.cfg, "event", topic0);
  ctx.events.set(topic0, p);
  return p;
}

async function lookupSignatureDb(cfg: DecodeConfig, kind: "function" | "event", hash: Hex): Promise<string[]> {
  if (cfg.sources?.signatureDb === false) return [];
  const base = cfg.signatureDbUrl ?? "https://api.openchain.xyz/signature-database/v1/lookup";
  const url = `${base}?${kind}=${hash}&filter=true`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { result?: Record<string, Record<string, { name: string }[] | null>> };
    return (json.result?.[kind]?.[hash] ?? []).map((e) => e.name);
  } catch {
    return [];
  }
}

async function decodeArgs(
  ctx: Ctx,
  inputs: readonly { name?: string; type: string }[],
  raw: readonly unknown[],
  parentTo: Address | undefined,
  depth: number,
): Promise<DecodedArg[]> {
  const out: DecodedArg[] = [];
  for (let i = 0; i < raw.length; i++) {
    const input = inputs[i];
    const type = input?.type ?? "";
    const arg: DecodedArg = { name: input?.name || `arg${i}`, type, value: stringifyValue(raw[i]) };
    if (depth < 2) {
      const siblingAddr = raw.find((v, j) => j !== i && inputs[j]?.type === "address") as Address | undefined;
      if (type === "bytes" && typeof raw[i] === "string" && looksLikeCalldata(raw[i] as Hex)) {
        // Callee from a sibling address arg is a heuristic, so flag it.
        const viaHeuristic = !!siblingAddr && siblingAddr.toLowerCase() !== parentTo?.toLowerCase();
        const inner = await decodeCalldata(ctx, raw[i] as Hex, siblingAddr ?? parentTo, depth + 1);
        if (inner.decoded) {
          arg.nested = [viaHeuristic && !inner.decoded.guess ? { ...inner.decoded, guess: true } : inner.decoded];
        }
      } else if (type === "bytes[]" && Array.isArray(raw[i])) {
        const calls: DecodedCall[] = [];
        for (const el of raw[i] as Hex[]) {
          if (typeof el === "string" && looksLikeCalldata(el)) {
            const inner = await decodeCalldata(ctx, el, parentTo, depth + 1); // multicall self-call
            if (inner.decoded) calls.push(inner.decoded);
          }
        }
        if (calls.length) arg.nested = calls;
      }
    }
    out.push(arg);
  }
  return out;
}

async function decodeCalldata(
  ctx: Ctx,
  data: Hex,
  to: Address | undefined,
  depth = 0,
): Promise<{ decoded: DecodedCall | null; proxy: ProxyInfo | null }> {
  let proxy: ProxyInfo | null = null;
  let decoded: DecodedCall | null = null;

  if (to) {
    proxy = await readProxy(ctx, to);
    const abiRes = await effectiveAbi(ctx, to);
    if (abiRes) {
      try {
        const { functionName, args } = decodeFunctionData({ abi: abiRes.abi, data });
        const list = (args ?? []) as readonly unknown[];
        const fn = matchFunction(abiRes.abi, data);
        const decodedArgs = await decodeArgs(ctx, fn?.inputs ?? [], list, to, depth);
        decoded = buildCall(data, fn, functionName, decodedArgs, abiRes.source, false);
      } catch {
        decoded = null;
      }
    }
  }

  if (!decoded) {
    try {
      const { functionName, args } = decodeFunctionData({ abi: COMMON_ABI, data });
      const list = (args ?? []) as readonly unknown[];
      const fn = matchFunction(COMMON_ABI, data);
      const decodedArgs = await decodeArgs(ctx, fn?.inputs ?? [], list, to, depth);
      decoded = buildCall(data, fn, functionName, decodedArgs, "standard ABI", false);
    } catch {
      // not a common standard function
    }
  }

  if (!decoded) {
    const candidates = await lookupSelector(ctx, slice(data, 0, 4));
    for (const sig of candidates) {
      try {
        const item = parseAbiItem(`function ${sig}`) as AbiFunction;
        const { functionName, args } = decodeFunctionData({ abi: [item], data });
        const list = (args ?? []) as readonly unknown[];
        const decodedArgs = await decodeArgs(ctx, item.inputs, list, to, depth);
        decoded = buildCall(data, item, functionName, decodedArgs, "openchain signature DB", true, candidates);
        break;
      } catch {
        // selector collision with incompatible types; try the next candidate
      }
    }
  }

  // Gnosis Safe multiSend(bytes) packs sub-txs in a custom (non-ABI) layout.
  if (decoded?.selector === MULTISEND_SELECTOR && depth < 2) {
    const packed = decoded.args[0]?.value;
    if (typeof packed === "string" && packed.startsWith("0x")) {
      const batch = await expandMultiSend(ctx, packed as Hex, depth);
      if (batch.length) decoded = { ...decoded, batch };
    }
  }

  return { decoded, proxy };
}

const MULTISEND_SELECTOR: Hex = "0x8d80ff0a"; // multiSend(bytes)

// Entry: operation(1) ‖ to(20) ‖ value(32) ‖ dataLength(32) ‖ data.
async function expandMultiSend(ctx: Ctx, packed: Hex, depth: number): Promise<InnerTx[]> {
  const hex = packed.slice(2);
  const out: InnerTx[] = [];
  let i = 0;
  while (i + 170 <= hex.length && out.length < 100) {
    const operation = parseInt(hex.slice(i, i + 2) || "0", 16);
    const to = getAddress(`0x${hex.slice(i + 2, i + 42)}`);
    const value = BigInt(`0x${hex.slice(i + 42, i + 106) || "0"}`);
    const dataLen = Number(BigInt(`0x${hex.slice(i + 106, i + 170) || "0"}`));
    const start = i + 170;
    const end = start + dataLen * 2;
    if (end > hex.length) break;
    const innerData = `0x${hex.slice(start, end)}` as Hex;
    const decoded = dataLen >= 4 && depth < 2 ? (await decodeCalldata(ctx, innerData, to, depth + 1)).decoded : null;
    out.push({
      index: out.length,
      operation: operation === 1 ? "delegatecall" : "call",
      to,
      value: value.toString(),
      data: innerData,
      decoded,
    });
    i = end;
  }
  return out;
}

async function decodeLog(ctx: Ctx, log: { address: Address; topics: readonly Hex[]; data: Hex }): Promise<DecodedLog> {
  const topic0 = (log.topics[0] ?? null) as Hex | null;
  const base = { address: getAddress(log.address), topic0 };

  const abiRes = await effectiveAbi(ctx, log.address);
  if (abiRes) {
    try {
      const decoded = decodeEventLog({ abi: abiRes.abi, topics: log.topics as [Hex, ...Hex[]], data: log.data });
      const eventName = decoded.eventName ?? "";
      const ev = matchEvent(abiRes.abi, log.topics[0]);
      return {
        ...base,
        eventName,
        signature: eventSignature(ev, eventName),
        args: mapEventArgs(ev?.inputs, decoded.args),
        source: abiRes.source,
        guess: false,
      };
    } catch {
      // fall through to signature DB
    }
  }

  if (topic0) {
    const candidates = await lookupEvent(ctx, topic0);
    const indexedCount = log.topics.length - 1;
    for (const sig of candidates) {
      const item = buildEventItem(sig, indexedCount);
      if (!item) continue;
      try {
        const decoded = decodeEventLog({ abi: [item], topics: log.topics as [Hex, ...Hex[]], data: log.data });
        return {
          ...base,
          eventName: decoded.eventName ?? sig.slice(0, sig.indexOf("(")),
          signature: sig,
          args: mapEventArgs(item.inputs, decoded.args),
          source: "openchain signature DB",
          guess: true,
        };
      } catch {
        // wrong indexed layout for this candidate; try the next
      }
    }
    // Never show heuristic-decoded args, only the name.
    if (candidates.length) {
      return {
        ...base,
        eventName: candidates[0].slice(0, candidates[0].indexOf("(")),
        signature: candidates[0],
        args: [],
        source: "openchain (name only)",
        guess: true,
      };
    }
  }

  return { ...base, eventName: "", signature: topic0 ?? "anonymous event", args: [], source: "", guess: false };
}

function eventSignature(ev: AbiEvent | undefined, name: string): string {
  return ev ? `${name}(${ev.inputs.map((p) => p.type).join(",")})` : name;
}

function mapEventArgs(inputs: readonly { name?: string; type: string }[] | undefined, args: unknown): DecodedArg[] {
  if (!inputs) return [];
  const asArray = Array.isArray(args);
  const asObject = args && typeof args === "object" ? (args as Record<string, unknown>) : undefined;
  return inputs.map((inp, i) => {
    const v = asArray ? (args as unknown[])[i] : asObject?.[inp.name ?? String(i)];
    return { name: inp.name || `arg${i}`, type: inp.type, value: stringifyValue(v) };
  });
}

function buildEventItem(sig: string, indexedCount: number): AbiEvent | null {
  const open = sig.indexOf("(");
  if (open < 0) return null;
  const name = sig.slice(0, open);
  const inner = sig.slice(open + 1, sig.lastIndexOf(")"));
  const types = inner ? splitTopLevel(inner) : [];
  const params = types.map((t, i) => `${t}${i < indexedCount ? " indexed" : ""} p${i}`);
  try {
    return parseAbiItem(`event ${name}(${params.join(", ")})`) as AbiEvent;
  } catch {
    return null;
  }
}

// Accepts a JSON ABI or human-readable lines.
export function parseAbiText(text: string): Abi | null {
  const t = text.trim();
  if (!t) return null;
  try {
    if (t.startsWith("[") || t.startsWith("{")) {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? (parsed as Abi) : ([parsed] as Abi);
    }
    return parseAbi(
      t
        .split("\n")
        .map((l) => l.trim().replace(/,$/, ""))
        .filter(Boolean),
    ) as Abi;
  } catch {
    return null;
  }
}

export function decodeWithCustomAbi(data: Hex, abi: Abi): DecodedCall | null {
  try {
    const { functionName, args } = decodeFunctionData({ abi, data });
    const list = (args ?? []) as readonly unknown[];
    const fn = matchFunction(abi, data);
    const inputs = fn?.inputs ?? [];
    const decodedArgs: DecodedArg[] = list.map((v, i) => ({
      name: inputs[i]?.name || `arg${i}`,
      type: inputs[i]?.type ?? "",
      value: stringifyValue(v),
    }));
    return buildCall(data, fn, functionName, decodedArgs, "custom ABI", false);
  } catch {
    return null;
  }
}

const PANIC_CODES: Record<string, string> = {
  "0": "generic",
  "1": "assert(false)",
  "17": "arithmetic overflow/underflow",
  "18": "division or modulo by zero",
  "33": "invalid enum value",
  "34": "bad encoded storage byte array",
  "49": "pop() on empty array",
  "50": "array index out of bounds",
  "65": "out-of-memory allocation",
  "81": "call to zero-initialized function",
};

async function decodeError(ctx: Ctx, data: Hex): Promise<DecodedError> {
  if (data.length < 10) return { kind: "raw", name: "", signature: data, args: [], raw: data };
  const selector = slice(data, 0, 4);

  if (selector === "0x08c379a0") {
    try {
      const [reason] = decodeAbiParameters([{ type: "string" }], `0x${data.slice(10)}`);
      return {
        kind: "Error",
        name: "Error",
        signature: "Error(string)",
        args: [{ name: "reason", type: "string", value: String(reason) }],
        raw: data,
      };
    } catch {
      // fall through
    }
  }
  if (selector === "0x4e487b71") {
    try {
      const [code] = decodeAbiParameters([{ type: "uint256" }], `0x${data.slice(10)}`);
      const c = (code as bigint).toString();
      return {
        kind: "Panic",
        name: "Panic",
        signature: "Panic(uint256)",
        args: [{ name: "code", type: "uint256", value: `${c} (${PANIC_CODES[c] ?? "unknown"})` }],
        raw: data,
      };
    } catch {
      // fall through
    }
  }

  for (const sig of await lookupSelector(ctx, selector)) {
    try {
      const item = parseAbiItem(`error ${sig}`) as AbiError;
      const res = decodeErrorResult({ abi: [item], data });
      const list = (res.args ?? []) as readonly unknown[];
      const decodedArgs = list.map((v, i) => ({
        name: item.inputs[i]?.name || `arg${i}`,
        type: item.inputs[i]?.type ?? "",
        value: stringifyValue(v),
      }));
      return { kind: "custom", name: sig.slice(0, sig.indexOf("(")), signature: sig, args: decodedArgs, raw: data };
    } catch {
      // selector collision; try the next candidate
    }
  }
  return { kind: "raw", name: "", signature: selector, args: [], raw: data };
}

function extractRevertData(err: unknown): Hex | null {
  if (err instanceof BaseError) {
    const found = err.walk((e) => typeof (e as { data?: unknown }).data === "string");
    const d = (found as { data?: unknown } | null)?.data;
    if (typeof d === "string" && d.startsWith("0x") && d.length >= 10) return d as Hex;
  }
  return null;
}

// Best effort: public RPCs rarely reproduce this, so null means unknown.
async function recoverRevert(
  ctx: Ctx,
  tx: { from: Address; to: Address | null; input: Hex; value: bigint; blockNumber: bigint | null },
): Promise<DecodedError | null> {
  if (!tx.to) return null;
  try {
    await ctx.client.call({
      account: tx.from,
      to: tx.to,
      data: tx.input,
      value: tx.value,
      ...(tx.blockNumber ? { blockNumber: tx.blockNumber } : {}),
    });
    return null;
  } catch (err) {
    const data = extractRevertData(err);
    return data ? decodeError(ctx, data) : null;
  }
}

export async function decodeRevertData(cfg: DecodeConfig, data: Hex): Promise<DecodedError> {
  return decodeError(makeCtx(cfg), data);
}

export async function reverseEns(address: Address): Promise<string | null> {
  try {
    const client = makeClient(1);
    return await client.getEnsName({ address });
  } catch {
    return null;
  }
}

export async function resolveEnsName(name: string): Promise<Address | null> {
  try {
    const client = makeClient(1);
    return await client.getEnsAddress({ name: normalize(name) });
  } catch {
    return null;
  }
}

export async function analyzeCalldata(
  cfg: DecodeConfig,
  data: Hex,
  to?: Address,
): Promise<{ decoded: DecodedCall | null; proxy: ProxyInfo | null }> {
  return decodeCalldata(makeCtx(cfg), data, to);
}

export async function fetchTransaction(cfg: DecodeConfig, hash: Hex): Promise<TxInfo | null> {
  try {
    const tx = await makeClient(cfg.chainId).getTransaction({ hash });
    return { hash, from: tx.from, to: tx.to, value: tx.value, input: tx.input };
  } catch {
    return null;
  }
}

async function findTxChain(currentChainId: number, hash: Hex): Promise<number | null> {
  const others = lookupChains().filter((c) => c.id !== currentChainId);
  const checks = await mapLimit(others, 5, async (c) => {
    try {
      await makeClient(c.id).getTransaction({ hash });
      return c.id;
    } catch {
      return null;
    }
  });
  return checks.find((id): id is number => id !== null) ?? null;
}

export async function analyzeTransaction(cfg: DecodeConfig, hash: Hex): Promise<TxReport | null> {
  const onSelected = await analyzeTxOnChain(cfg, hash);
  if (onSelected) return onSelected;
  const otherChain = await findTxChain(cfg.chainId, hash);
  if (otherChain == null) return null;
  return analyzeTxOnChain({ ...cfg, chainId: otherChain }, hash);
}

async function analyzeTxOnChain(cfg: DecodeConfig, hash: Hex): Promise<TxReport | null> {
  const ctx = makeCtx(cfg);
  let tx;
  try {
    tx = await ctx.client.getTransaction({ hash });
  } catch {
    return null;
  }

  const receipt = await ctx.client.getTransactionReceipt({ hash }).catch(() => null);
  const block = receipt ? await ctx.client.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null) : null;

  const hasData = tx.input && tx.input !== "0x";
  const { decoded, proxy } = hasData
    ? await decodeCalldata(ctx, tx.input, tx.to ?? undefined)
    : { decoded: null, proxy: null };

  const logs = receipt ? await mapLimit(receipt.logs, 6, (l) => decodeLog(ctx, l)) : [];

  const revert =
    receipt?.status === "reverted"
      ? await recoverRevert(ctx, {
          from: tx.from,
          to: tx.to,
          input: tx.input,
          value: tx.value,
          blockNumber: tx.blockNumber,
        })
      : null;

  return {
    chainId: cfg.chainId,
    hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    input: tx.input,
    status: receipt?.status ?? null,
    gasUsed: receipt?.gasUsed ?? null,
    effectiveGasPrice: receipt?.effectiveGasPrice ?? null,
    blockNumber: receipt?.blockNumber ?? tx.blockNumber ?? null,
    timestamp: block ? Number(block.timestamp) : null,
    decoded,
    proxy,
    logs,
    revert,
    authorizations: tx.type === "eip7702" ? await readAuthorizations(tx.authorizationList) : [],
  };
}

function readAuthorizations(list: readonly SignedAuthorization[]): Promise<Authorization[]> {
  return Promise.all(
    list.map(async (a) => ({
      authority: await recoverAuthorizationAddress({ authorization: a }).catch(() => null),
      delegate: a.address === zeroAddress ? null : getAddress(a.address),
      chainId: a.chainId,
    })),
  );
}

async function readMultisig(client: Client, address: Address): Promise<MultisigInfo | null> {
  try {
    const [owners, threshold] = await Promise.all([
      client.readContract({ address, abi: SAFE_ABI, functionName: "getOwners" }),
      client.readContract({ address, abi: SAFE_ABI, functionName: "getThreshold" }),
    ]);
    if (!Array.isArray(owners) || owners.length === 0) return null;
    const [version, nonce] = await Promise.all([
      client.readContract({ address, abi: SAFE_ABI, functionName: "VERSION" }).catch(() => undefined),
      client.readContract({ address, abi: SAFE_ABI, functionName: "nonce" }).catch(() => undefined),
    ]);
    return {
      kind: version ? `Safe ${version}` : "Safe-compatible",
      owners: (owners as Address[]).map((o) => getAddress(o)),
      threshold: Number(threshold),
      version: version as string | undefined,
      nonce: nonce != null ? (nonce as bigint).toString() : undefined,
    };
  } catch {
    return null;
  }
}

async function probeOtherChains(currentChainId: number, address: Address): Promise<ChainPresence[]> {
  const others = lookupChains().filter((c) => c.id !== currentChainId);
  const found = await mapLimit(others, 5, async (c) => {
    try {
      const client = makeClient(c.id);
      const code = await client.getCode({ address }).catch(() => undefined);
      if (!code || code === "0x") return null;
      const delegate = parseDelegation(code);
      return {
        chainId: c.id,
        name: c.name,
        delegate,
        multisig: delegate ? null : await readMultisig(client, address),
      };
    } catch {
      return null;
    }
  });
  return found.filter((c): c is ChainPresence => c !== null);
}

export async function analyzeAddress(
  cfg: DecodeConfig,
  address: Address,
): Promise<{
  checksum: Address;
  ens: string | null;
  isContract: boolean;
  delegate: Address | null;
  proxy: ProxyInfo | null;
  multisig: MultisigInfo | null;
  otherChains: ChainPresence[];
}> {
  const checksum = getAddress(address);
  const ctx = makeCtx(cfg);
  const [ens, code, proxy] = await Promise.all([
    reverseEns(checksum),
    ctx.client.getCode({ address: checksum }).catch(() => undefined),
    readProxy(ctx, checksum),
  ]);
  const delegate = parseDelegation(code);
  const isContract = !!code && code !== "0x" && !delegate;
  const multisig = isContract ? await readMultisig(ctx.client, checksum) : null;
  // A contract here is already the answer.
  const otherChains = isContract ? [] : await probeOtherChains(cfg.chainId, checksum);
  return { checksum, ens, isContract, delegate, proxy, multisig, otherChains };
}

export async function testEvmRpc(url: string): Promise<{ chainId: number; ms: number }> {
  const start = Date.now();
  const chainId = await createPublicClient({ transport: http(url, { retryCount: 0, timeout: 8000 }) }).getChainId();
  return { chainId, ms: Date.now() - start };
}
