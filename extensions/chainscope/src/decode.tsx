import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Form,
  Icon,
  Image,
  List,
  Toast,
  openExtensionPreferences,
  showInFinder,
  showToast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { showFailureToast, usePromise } from "@raycast/utils";
import { createContext, useContext, useMemo, useState } from "react";
import { formatEther, formatGwei, slice, type Address, type Hex } from "viem";
import { withSettings } from "./with-settings";
import { convertUnits, csvCell, uniqueFileName } from "./lib/convert";
import { openCommand } from "./lib/launch";
import { detect, type DetectedKind } from "./lib/detect";
import {
  analyzeAddress,
  analyzeCalldata,
  analyzeTransaction,
  decodeWithCustomAbi,
  parseAbiText,
  resolveEnsName,
  type ChainPresence,
  type DecodedCall,
  type DecodedError,
  type DecodedLog,
  type InnerTx,
  type MultisigInfo,
  type ProxyInfo,
  type TxReport,
} from "./lib/evm";
import { chainName, explorerUrl, getConfig, getSolanaConfig, nativeSymbol, solscanUrl } from "./lib/prefs";
import {
  analyzeSolanaAddress,
  analyzeSolanaTransaction,
  type SolAccount,
  type SolInstruction,
  type SolTransfer,
  type SolTxReport,
} from "./lib/svm";
import { isDecodable } from "./decode-hint";

type ClipItem = { offset: number; value: string; kind: DetectedKind };

const KIND_LABEL: Record<DetectedKind, string> = {
  txHash: "tx hash",
  address: "address",
  calldata: "calldata",
  ensName: "ENS name",
  number: "number",
  hex: "hex",
  solanaSig: "Solana signature",
  solanaAddress: "Solana address",
  unknown: "text",
  empty: "",
};

const KIND_ICON: Partial<Record<DetectedKind, Icon>> = {
  txHash: Icon.Link,
  address: Icon.Wallet,
  calldata: Icon.Code,
  ensName: Icon.Globe,
  number: Icon.Calculator,
  hex: Icon.Calculator,
  solanaSig: Icon.Link,
  solanaAddress: Icon.Wallet,
};

function truncMiddle(s: string, max = 56): string {
  return s.length <= max ? s : `${s.slice(0, max - 8)}…${s.slice(-6)}`;
}

// Raycast caps clipboard offset at 5, so only 6 entries are reachable.
async function readClipboardHistory(limit = 6): Promise<ClipItem[]> {
  const items: ClipItem[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < limit; offset++) {
    let value: string | undefined;
    try {
      value = await Clipboard.readText({ offset });
    } catch {
      break;
    }
    if (value === undefined) break;
    const v = value.trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    items.push({ offset, value: v, kind: detect(v).kind });
  }
  return items;
}

type Analysis =
  | {
      type: "address";
      checksum: Address;
      ens: string | null;
      isContract: boolean;
      delegate: Address | null;
      proxy: ProxyInfo | null;
      multisig: MultisigInfo | null;
      otherChains: ChainPresence[];
    }
  | { type: "ensName"; address: Address | null }
  | { type: "tx"; report: TxReport }
  | { type: "txNotFound" }
  | { type: "calldata"; decoded: DecodedCall | null; selector: Hex; raw: Hex }
  | { type: "solTx"; report: SolTxReport }
  | { type: "solAccount"; account: SolAccount; address: string }
  | { type: "solNotFound" };

const NETWORK_KINDS: DetectedKind[] = ["address", "ensName", "txHash", "calldata", "solanaSig", "solanaAddress"];

const jsonReplacer = (_k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

type ExportData = { json: string; csv: string; base: string };

const RowCtx = createContext<{
  toggleDetail: () => void;
  showingDetail: boolean;
  exp: ExportData | null;
  customAbiData: Hex | null;
  repick: () => void;
}>({
  toggleDetail: () => {},
  showingDetail: false,
  exp: null,
  customAbiData: null,
  repick: () => {},
});

async function runAnalysis(
  cfg: ReturnType<typeof getConfig>,
  solCfg: ReturnType<typeof getSolanaConfig>,
  kind: DetectedKind,
  value: string,
): Promise<Analysis | null> {
  switch (kind) {
    case "address": {
      const r = await analyzeAddress(cfg, value as Address);
      return { type: "address", ...r };
    }
    case "ensName":
      return { type: "ensName", address: await resolveEnsName(value) };
    case "txHash": {
      const report = await analyzeTransaction(cfg, value as Hex);
      return report ? { type: "tx", report } : { type: "txNotFound" };
    }
    case "calldata": {
      const { decoded } = await analyzeCalldata(cfg, value as Hex);
      return { type: "calldata", decoded, selector: slice(value as Hex, 0, 4), raw: value as Hex };
    }
    case "solanaSig": {
      const report = await analyzeSolanaTransaction(solCfg, value);
      return report ? { type: "solTx", report } : { type: "solNotFound" };
    }
    case "solanaAddress": {
      const account = await analyzeSolanaAddress(solCfg, value);
      return account ? { type: "solAccount", account, address: value } : { type: "solNotFound" };
    }
    default:
      return null;
  }
}

function inlineCall(c: DecodedCall | null, data?: Hex): string {
  if (!c) return data ? data.slice(0, 10) : "raw";
  const args = c.args.map((a) => (a.value.length > 24 ? `${a.value.slice(0, 22)}…` : a.value)).join(", ");
  return `${c.functionName}(${args})`;
}

function callRows(c: DecodedCall, section: string): string[][] {
  return [[section, "function", "", c.signature], ...c.args.map((a) => [section, a.name, a.type, a.value])];
}

function batchRows(c: DecodedCall): string[][] {
  const rows: string[][] = [];
  c.batch?.forEach((b) => {
    const s = `batch#${b.index}`;
    rows.push(
      [s, "to", "address", b.to],
      [s, "value", "wei", b.value],
      [s, "operation", "", b.operation],
      [s, "call", "", inlineCall(b.decoded, b.data)],
    );
    b.decoded?.args.forEach((x) => rows.push([s, x.name, x.type, x.value]));
  });
  return rows;
}

function analysisToCsv(a: Analysis): string {
  const rows: string[][] = [["section", "field", "type", "value"]];
  if (a.type === "tx") {
    const r = a.report;
    rows.push(
      ["tx", "status", "", r.status ?? ""],
      ["tx", "gasUsed", "", r.gasUsed?.toString() ?? ""],
      ["tx", "block", "", r.blockNumber?.toString() ?? ""],
      ["tx", "from", "address", r.from],
      ["tx", "to", "address", r.to ?? ""],
      ["tx", "value", "wei", r.value.toString()],
      ["tx", "hash", "", r.hash],
    );
    if (r.proxy) rows.push(["proxy", "implementation", "address", r.proxy.implementation]);
    r.authorizations.forEach((x, i) =>
      rows.push([`authorization#${i}`, x.authority ?? "unknown", "address", x.delegate ?? "removes delegation"]),
    );
    if (r.revert)
      rows.push([
        "revert",
        r.revert.name || "reason",
        "",
        r.revert.args.map((x) => x.value).join(" ") || r.revert.signature,
      ]);
    if (r.decoded) rows.push(...callRows(r.decoded, "input"), ...batchRows(r.decoded));
    r.logs.forEach((l, i) => {
      rows.push([`log#${i}`, "event", "", l.signature], [`log#${i}`, "emitter", "address", l.address]);
      l.args.forEach((x) => rows.push([`log#${i}`, x.name, x.type, x.value]));
    });
  } else if (a.type === "calldata") {
    if (a.decoded) rows.push(...callRows(a.decoded, "call"), ...batchRows(a.decoded));
  } else if (a.type === "address") {
    rows.push(
      ["address", "checksum", "address", a.checksum],
      ["address", "type", "", a.delegate ? "EIP-7702 wallet" : a.isContract ? "contract" : "EOA"],
    );
    if (a.delegate) rows.push(["address", "delegate", "address", a.delegate]);
    if (a.ens) rows.push(["address", "ens", "", a.ens]);
    if (a.proxy) rows.push(["proxy", "implementation", "address", a.proxy.implementation]);
    if (a.multisig) {
      rows.push(
        ["multisig", "kind", "", a.multisig.kind],
        ["multisig", "threshold", "", `${a.multisig.threshold} of ${a.multisig.owners.length}`],
      );
      a.multisig.owners.forEach((o, i) => rows.push(["multisig", `signer ${i + 1}`, "address", o]));
    }
  } else if (a.type === "ensName") {
    rows.push(["ens", "address", "address", a.address ?? ""]);
  } else if (a.type === "solTx") {
    const r = a.report;
    rows.push(
      ["tx", "status", "", r.status],
      ["tx", "fee", "SOL", r.fee],
      ["tx", "computeUnits", "", r.computeUnits?.toString() ?? ""],
      ["tx", "slot", "", r.slot.toString()],
      ["tx", "signer", "address", r.signer ?? ""],
      ["tx", "signature", "", r.signature],
    );
    r.transfers.forEach((t, i) => {
      rows.push(
        [`transfer#${i}`, "kind", "", t.kind],
        [`transfer#${i}`, "amount", t.mint ?? (t.kind === "SPL" ? "raw units" : ""), t.amount],
        [`transfer#${i}`, "from", "address", t.from],
        [`transfer#${i}`, "to", "address", t.to],
      );
    });
    r.instructions.forEach((ix) => {
      const s = `ix#${ix.index}`;
      rows.push([s, "program", "", ix.program], [s, "instruction", ix.source, ix.summary]);
      ix.args.forEach((x) => rows.push([s, x.name, x.type, x.value]));
    });
  } else if (a.type === "solAccount") {
    rows.push(
      ["account", "address", "address", a.account.address],
      ["account", "balance", "SOL", a.account.lamports],
      ["account", "owner", "address", a.account.owner],
      ["account", "executable", "", String(a.account.executable)],
    );
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

function exportBase(a: Analysis): string {
  if (a.type === "tx") return `chainscope-tx-${a.report.hash.slice(0, 10)}`;
  if (a.type === "calldata") return `chainscope-calldata-${a.selector}`;
  if (a.type === "address") return `chainscope-address-${a.checksum.slice(0, 10)}`;
  if (a.type === "ensName") return "chainscope-ens";
  if (a.type === "solTx") return `chainscope-soltx-${a.report.signature.slice(0, 10)}`;
  if (a.type === "solAccount") return `chainscope-solacct-${a.address.slice(0, 10)}`;
  return "chainscope-decode";
}

async function downloadFile(content: string, name: string, label: string) {
  try {
    const dir = join(homedir(), "Downloads");
    const unique = uniqueFileName(name, (n) => existsSync(join(dir, n)));
    const path = join(dir, unique);
    writeFileSync(path, content, { encoding: "utf8", flag: "wx" });
    await showToast({ style: Toast.Style.Success, title: `Saved ${label}`, message: unique });
    await showInFinder(path);
  } catch (e) {
    await showFailureToast(e, { title: `Could not save ${label}` });
  }
}

function SettingsActions() {
  return (
    <ActionPanel>
      <Action
        title="Manage Networks"
        icon={Icon.Network}
        onAction={() => openCommand("manage-networks", "Manage Networks")}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function Command(props: LaunchProps) {
  const handoff = (props.launchContext as { text?: string } | undefined)?.text?.trim();
  const [text, setText] = useState(handoff ?? "");
  const [showDetail, setShowDetail] = useState(false);
  const { data: history = [], isLoading: readingClipboard } = usePromise(readClipboardHistory, [], {
    execute: !handoff,
    onData: (items) => {
      if (items[0] && isDecodable(items[0].kind)) setText(items[0].value);
    },
  });
  const seeded = !!handoff || !readingClipboard;

  const cfg = useMemo(() => getConfig(), []);
  const solCfg = useMemo(() => getSolanaConfig(), []);
  const det = detect(text);
  const isNetwork = NETWORK_KINDS.includes(det.kind) && det.value.length > 0;

  const { data, isLoading, error } = usePromise(runAnalysis, [cfg, solCfg, det.kind, det.value], {
    execute: isNetwork,
  });

  const exp = useMemo<ExportData | null>(
    () =>
      data ? { json: JSON.stringify(data, jsonReplacer, 2), csv: analysisToCsv(data), base: exportBase(data) } : null,
    [data],
  );
  const customAbiData = useMemo<Hex | null>(() => {
    if (data?.type === "calldata") return data.raw;
    if (data?.type === "tx" && data.report.input && data.report.input !== "0x") return data.report.input;
    return null;
  }, [data]);
  const showingDetail = showDetail && !!data;
  const ctx = useMemo(
    () => ({
      toggleDetail: () => setShowDetail((v) => !v),
      showingDetail,
      exp,
      customAbiData,
      repick: () => setText(""),
    }),
    [showingDetail, exp, customAbiData],
  );

  return (
    <RowCtx.Provider value={ctx}>
      <List
        searchText={text}
        onSearchTextChange={setText}
        searchBarPlaceholder="Paste a transaction, address, ENS name, or call data"
        filtering={false}
        isShowingDetail={showingDetail}
        isLoading={(isNetwork && isLoading) || !seeded}
      >
        {text ? (
          <Body text={text} det={det} cfg={cfg} analysis={data ?? null} error={error} />
        ) : (
          <ClipboardPicker history={history} seeded={seeded} onPick={setText} />
        )}
      </List>
    </RowCtx.Provider>
  );
}

function ClipboardPicker({
  history,
  seeded,
  onPick,
}: {
  history: ClipItem[];
  seeded: boolean;
  onPick: (v: string) => void;
}) {
  if (history.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.Wand}
        title={seeded ? "Paste something to decode" : "Reading clipboard…"}
        description="A transaction hash, address, ENS name, call data, or Solana signature"
      />
    );
  }
  const decodable = history.filter((h) => isDecodable(h.kind));
  const other = history.filter((h) => !isDecodable(h.kind));
  return (
    <>
      {decodable.length > 0 && (
        <List.Section title="Ready to Decode">
          {decodable.map((h) => (
            <ClipItemRow key={h.offset} item={h} onPick={onPick} />
          ))}
        </List.Section>
      )}
      {other.length > 0 && (
        <List.Section title="Other Clipboard Items">
          {other.map((h) => (
            <ClipItemRow key={h.offset} item={h} onPick={onPick} />
          ))}
        </List.Section>
      )}
    </>
  );
}

function ClipItemRow({ item, onPick }: { item: ClipItem; onPick: (v: string) => void }) {
  const accessories = item.offset === 0 ? [{ tag: { value: "latest", color: Color.Blue } }] : undefined;
  return (
    <List.Item
      icon={KIND_ICON[item.kind] ?? Icon.Clipboard}
      title={truncMiddle(item.value)}
      subtitle={KIND_LABEL[item.kind]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Decode" icon={Icon.Wand} onAction={() => onPick(item.value)} />
          <Action.CopyToClipboard title="Copy" content={item.value} />
        </ActionPanel>
      }
    />
  );
}

function Body({
  text,
  det,
  cfg,
  analysis,
  error,
}: {
  text: string;
  det: { kind: DetectedKind; value: string };
  cfg: ReturnType<typeof getConfig>;
  analysis: Analysis | null;
  error?: Error;
}) {
  if (!text) {
    return (
      <List.EmptyView
        icon={Icon.Wand}
        title="Paste something to decode"
        description="A transaction hash, address, ENS name, call data, or Solana signature"
      />
    );
  }

  if (error) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        title="Couldn't look that up"
        description={error.message.split("\n")[0]}
        actions={<SettingsActions />}
      />
    );
  }

  switch (det.kind) {
    case "address":
      return analysis?.type === "address" ? <AddressView a={analysis} cfg={cfg} /> : null;
    case "ensName":
      return analysis?.type === "ensName" ? <EnsView name={det.value} address={analysis.address} cfg={cfg} /> : null;
    case "txHash":
      if (analysis?.type === "tx") return <TxView report={analysis.report} cfg={cfg} />;
      if (analysis?.type === "txNotFound")
        return (
          <List.EmptyView
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Orange }}
            title="Transaction not found"
            description="Checked your default chain, the common chains, and your networks. Press Enter to add the network it's on."
            actions={<SettingsActions />}
          />
        );
      return null;
    case "calldata":
      return analysis?.type === "calldata" ? (
        <CalldataView decoded={analysis.decoded} selector={analysis.selector} raw={det.value as Hex} />
      ) : null;
    case "solanaSig":
      if (analysis?.type === "solTx") return <SolTxView report={analysis.report} />;
      if (analysis?.type === "solNotFound")
        return (
          <List.EmptyView
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="Transaction not found"
            description="It isn't on the selected Solana cluster. Press Enter to change the cluster in preferences."
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      return null;
    case "solanaAddress":
      return analysis?.type === "solAccount" ? <SolAccountView account={analysis.account} /> : null;
    default:
      return <ValueView input={det.value} />;
  }
}

function CopyRow({
  id,
  title,
  subtitle,
  icon,
  tag,
  url,
  copy,
  detail,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: Image.ImageLike;
  tag?: { text: string; color?: Color };
  url?: string;
  copy?: string;
  detail?: string;
}) {
  const { toggleDetail, showingDetail, exp, customAbiData, repick } = useContext(RowCtx);
  const md = detail ?? `**${subtitle ?? "value"}**\n\n\`\`\`\n${title}\n\`\`\``;
  return (
    <List.Item
      id={id}
      icon={icon}
      title={title}
      subtitle={subtitle}
      accessories={tag && !showingDetail ? [{ tag: { value: tag.text, color: tag.color } }] : undefined}
      detail={<List.Item.Detail markdown={md} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy" content={copy ?? title} />
          {url ? <Action.OpenInBrowser title="Open in Explorer" url={url} /> : null}
          <Action.Paste title="Paste" content={copy ?? title} />
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={toggleDetail}
          />
          <Action
            title="Pick from Clipboard History"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={repick}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          {customAbiData ? (
            <Action.Push
              title="Decode with Custom ABI…"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              target={<CustomAbiForm data={customAbiData} />}
            />
          ) : null}
          {exp ? (
            <>
              <Action.CopyToClipboard
                title="Copy All as JSON"
                icon={Icon.CodeBlock}
                content={exp.json}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              />
              <Action
                title="Download as JSON"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "opt"], key: "j" }}
                onAction={() => downloadFile(exp.json, `${exp.base}.json`, "JSON")}
              />
              <Action
                title="Download as CSV"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
                onAction={() => downloadFile(exp.csv, `${exp.base}.csv`, "CSV")}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function CustomAbiForm({ data }: { data: Hex }) {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle="Decode with Custom ABI"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Decode"
            icon={Icon.Code}
            onSubmit={(values: { abi: string }) => {
              const abi = parseAbiText(values.abi);
              const decoded = abi ? decodeWithCustomAbi(data, abi) : null;
              const md = !abi
                ? "## Invalid ABI\n\nCould not parse. Paste a JSON ABI array, or human-readable lines like:\n\n```\nfunction transfer(address to, uint256 amount)\n```"
                : decoded
                  ? callMarkdown(decoded)
                  : `## No match\n\nThe ABI parsed, but no function in it matches selector \`${data.slice(0, 10)}\`.`;
              push(
                <Detail
                  navigationTitle="Decoded with ABI"
                  markdown={md}
                  actions={
                    decoded ? (
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy as JSON"
                          content={JSON.stringify(decoded, jsonReplacer, 2)}
                        />
                      </ActionPanel>
                    ) : undefined
                  }
                />,
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Decoding calldata ${data.slice(0, 10)}…  (${data.length} chars)`} />
      <Form.TextArea
        id="abi"
        title="ABI"
        placeholder={
          "JSON ABI array, or human-readable lines:\nfunction transfer(address to, uint256 amount)\nfunction approve(address spender, uint256 value)"
        }
      />
    </Form>
  );
}

// Signature DB candidates have no param names.
function rawSig(decoded: DecodedCall): string {
  return `${decoded.functionName}(${decoded.args.map((a) => a.type).join(",")})`;
}

function callMarkdown(decoded: DecodedCall): string {
  const head = `## ${decoded.signature}\n\n\`${decoded.selector}\` · ${decoded.source}${decoded.guess ? " · best guess" : ""}\n`;
  const rows = decoded.args.map((a, i) => `| ${i} | ${a.name} | \`${a.type}\` | ${escapePipes(a.value)} |`).join("\n");
  const table = decoded.args.length
    ? `\n| # | name | type | value |\n|---|---|---|---|\n${rows}\n`
    : "\n_no arguments_\n";
  const nested = decoded.args
    .flatMap((a) => a.nested ?? [])
    .map((c) => `\n**↳ ${c.signature}** (${c.source})`)
    .join("");
  const batch = decoded.batch ? `\n${batchMarkdown(decoded.batch)}` : "";
  return head + table + nested + batch;
}

function batchMarkdown(batch: InnerTx[]): string {
  const head = `### Batch — ${batch.length} transaction${batch.length === 1 ? "" : "s"}\n`;
  const rows = batch
    .map(
      (b) =>
        `| ${b.index} | ${b.operation} | \`${shortAddr(b.to)}\` | ${b.value} | ${escapePipes(inlineCall(b.decoded, b.data))} |`,
    )
    .join("\n");
  return `${head}\n| # | op | to | value (wei) | call |\n|---|---|---|---|---|\n${rows}\n`;
}

// Batches can be nested, e.g. Safe execTransaction → multiSend.
function collectBatches(call: DecodedCall): DecodedCall[] {
  const out: DecodedCall[] = [];
  if (call.batch?.length) out.push(call);
  for (const arg of call.args) for (const n of arg.nested ?? []) out.push(...collectBatches(n));
  return out;
}

function BatchSection({ batch, label }: { batch: InnerTx[]; label?: string }) {
  return (
    <List.Section title={`Batch — ${batch.length} transactions${label ? ` · via ${label}` : ""}`}>
      {batch.map((b) => (
        <CopyRow
          key={b.index}
          id={`batch-${b.index}`}
          icon={b.operation === "delegatecall" ? { source: Icon.Bolt, tintColor: Color.Orange } : Icon.ArrowRight}
          title={inlineCall(b.decoded, b.data)}
          subtitle={`#${b.index} · ${b.operation} · to ${shortAddr(b.to)}${b.value !== "0" ? ` · ${b.value} wei` : ""}`}
          tag={b.decoded?.guess ? { text: "best guess", color: Color.Orange } : undefined}
          copy={b.data}
          detail={b.decoded ? callMarkdown(b.decoded) : `**raw calldata**\n\n\`\`\`\n${b.data}\n\`\`\``}
        />
      ))}
    </List.Section>
  );
}

function escapePipes(s: string): string {
  const t = s.length > 200 ? `${s.slice(0, 200)}…` : s;
  return t.replace(/\|/g, "\\|");
}

function ArgRows({ decoded, prefix }: { decoded: DecodedCall; prefix: string }) {
  return (
    <>
      {decoded.args.map((arg, i) => (
        <CopyRow
          key={`${prefix}-arg-${i}`}
          id={`${prefix}-arg-${i}`}
          icon={arg.nested ? Icon.ChevronDownSmall : Icon.Dot}
          title={arg.value}
          subtitle={`${arg.name}${arg.type ? ` (${arg.type})` : ""}`}
          copy={arg.value}
        />
      ))}
      {decoded.args
        .flatMap((arg) => arg.nested ?? [])
        .map((call, i) => (
          <CopyRow
            key={`${prefix}-nested-${i}`}
            id={`${prefix}-nested-${i}`}
            icon={{ source: Icon.ArrowNe, tintColor: Color.Blue }}
            title={call.signature}
            subtitle="↳ nested call"
            tag={call.guess ? { text: "best guess", color: Color.Orange } : undefined}
            copy={call.signature}
            detail={callMarkdown(call)}
          />
        ))}
    </>
  );
}

function DecodedCallSection({ decoded, raw }: { decoded: DecodedCall; raw?: Hex }) {
  return (
    <List.Section title={decoded.guess ? "Decoded (best guess)" : "Decoded"} subtitle={decoded.source}>
      <CopyRow
        id="signature"
        icon={Icon.Code}
        title={decoded.signature}
        subtitle="function"
        tag={decoded.guess ? { text: "best guess", color: Color.Orange } : { text: decoded.source, color: Color.Green }}
        copy={decoded.signature}
        detail={callMarkdown(decoded)}
      />
      <CopyRow id="selector" icon={Icon.Tag} title={decoded.selector} subtitle="selector" copy={decoded.selector} />
      <ArgRows decoded={decoded} prefix="top" />
      {raw ? (
        <CopyRow id="raw" icon={Icon.Document} title="Raw calldata" subtitle={`${raw.length} chars`} copy={raw} />
      ) : null}
    </List.Section>
  );
}

function CandidatesSection({ candidates, current }: { candidates?: string[]; current: string }) {
  const others = (candidates ?? []).filter((c) => c !== current);
  if (others.length === 0) return null;
  return (
    <List.Section title="Other signatures with this selector">
      {others.map((sig, i) => (
        <CopyRow key={i} id={`cand-${i}`} icon={Icon.QuestionMark} title={sig} copy={sig} />
      ))}
    </List.Section>
  );
}

function LogsSection({ logs, cfg }: { logs: DecodedLog[]; cfg: ReturnType<typeof getConfig> }) {
  if (logs.length === 0) return null;
  return (
    <List.Section title={`Event Logs (${logs.length})`}>
      {logs.map((log, i) => (
        <CopyRow
          key={i}
          id={`log-${i}`}
          icon={log.eventName ? { source: Icon.Bolt, tintColor: Color.Yellow } : Icon.BulletPoints}
          title={log.eventName ? log.signature : (log.topic0 ?? "anonymous event")}
          subtitle={shortAddr(log.address)}
          tag={
            !log.eventName
              ? { text: "unknown", color: Color.SecondaryText }
              : log.guess
                ? { text: "best guess", color: Color.Orange }
                : undefined
          }
          url={explorerUrl(cfg.chainId, `address/${log.address}`)}
          copy={log.signature}
          detail={logMarkdown(log)}
        />
      ))}
    </List.Section>
  );
}

function logMarkdown(log: DecodedLog): string {
  const head = `## ${log.eventName || "Unknown event"}\n\n${log.signature}\n\nemitted by \`${log.address}\`${log.source ? ` · ${log.source}` : ""}${log.guess ? " · best guess" : ""}\n`;
  if (log.args.length === 0) return `${head}\n_arguments not decoded_\n`;
  const rows = log.args.map((a, i) => `| ${i} | ${a.name} | \`${a.type}\` | ${escapePipes(a.value)} |`).join("\n");
  return `${head}\n| # | name | type | value |\n|---|---|---|---|\n${rows}\n`;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function revertSummary(e: DecodedError): string {
  if (e.kind === "Error") return e.args[0]?.value ?? "Error";
  if (e.kind === "Panic") return `Panic: ${e.args[0]?.value ?? ""}`;
  if (e.kind === "custom") return `${e.name}(${e.args.map((a) => a.value).join(", ")})`;
  return e.raw;
}

function errorMarkdown(e: DecodedError): string {
  const head = `## Revert\n\n\`${e.signature}\`\n`;
  const body =
    e.args.length > 0
      ? `\n| name | type | value |\n|---|---|---|\n${e.args.map((a) => `| ${a.name} | \`${a.type}\` | ${escapePipes(a.value)} |`).join("\n")}\n`
      : `\n_no decoded fields_\n`;
  return `${head}${body}\n> Recovered by replaying the call — best-effort, may differ from the original on-chain failure.`;
}

function RevertSection({ revert }: { revert: DecodedError }) {
  return (
    <List.Section title="Revert Reason">
      <CopyRow
        id="revert"
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        title={revertSummary(revert)}
        subtitle={revert.kind === "custom" ? "custom error" : `${revert.kind} error`}
        tag={{ text: "best effort", color: Color.Orange }}
        copy={revertSummary(revert)}
        detail={errorMarkdown(revert)}
      />
    </List.Section>
  );
}

function CalldataView({ decoded, selector, raw }: { decoded: DecodedCall | null; selector: Hex; raw: Hex }) {
  if (!decoded) {
    return (
      <List.EmptyView
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Orange }}
        title="Couldn't decode this call"
        description={`Function ${selector} wasn't found. Press Enter to use the contract's ABI.`}
        actions={
          <ActionPanel>
            <Action.Push title="Decode with Custom ABI…" icon={Icon.Code} target={<CustomAbiForm data={raw} />} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <>
      <DecodedCallSection decoded={decoded} raw={raw} />
      {collectBatches(decoded).map((c, i) => (
        <BatchSection key={i} batch={c.batch!} label={c.functionName} />
      ))}
      <CandidatesSection candidates={decoded.candidates} current={rawSig(decoded)} />
    </>
  );
}

function TxView({ report, cfg }: { report: TxReport; cfg: ReturnType<typeof getConfig> }) {
  const statusTag =
    report.status === "success"
      ? { text: "Success", color: Color.Green }
      : report.status === "reverted"
        ? { text: "Reverted", color: Color.Red }
        : undefined;
  const cid = report.chainId;
  return (
    <>
      <List.Section
        title="Transaction"
        subtitle={cid === cfg.chainId ? chainName(cid) : `${chainName(cid)} · auto-detected`}
      >
        <CopyRow
          id="status"
          icon={
            report.status === "reverted"
              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          title={report.status ?? "unknown"}
          subtitle="status"
          tag={statusTag}
          copy={report.status ?? ""}
        />
        {report.gasUsed != null ? (
          <CopyRow
            id="gas"
            icon={Icon.Gauge}
            title={`${report.gasUsed.toString()} gas${report.effectiveGasPrice != null ? ` @ ${formatGwei(report.effectiveGasPrice)} gwei` : ""}`}
            subtitle="gas used"
            copy={report.gasUsed.toString()}
          />
        ) : null}
        {report.blockNumber != null ? (
          <CopyRow
            id="block"
            icon={Icon.Box}
            title={`${report.blockNumber.toString()}${report.timestamp ? `  ·  ${new Date(report.timestamp * 1000).toUTCString()}` : ""}`}
            subtitle="block"
            url={explorerUrl(cid, `block/${report.blockNumber.toString()}`)}
            copy={report.blockNumber.toString()}
          />
        ) : null}
        <CopyRow
          id="from"
          icon={Icon.Person}
          title={report.from}
          subtitle="from"
          url={explorerUrl(cid, `address/${report.from}`)}
          copy={report.from}
        />
        {report.to ? (
          <CopyRow
            id="to"
            icon={Icon.ArrowRight}
            title={report.to}
            subtitle="to"
            url={explorerUrl(cid, `address/${report.to}`)}
            copy={report.to}
          />
        ) : (
          <CopyRow id="to" icon={Icon.Hammer} title="Contract creation" subtitle="to" />
        )}
        <CopyRow
          id="value"
          icon={Icon.Coins}
          title={`${formatEther(report.value)} ${nativeSymbol(cid)}`}
          subtitle="value"
          copy={formatEther(report.value)}
        />
        <CopyRow
          id="hash"
          icon={Icon.Link}
          title={report.hash}
          subtitle="tx hash"
          url={explorerUrl(cid, `tx/${report.hash}`)}
          copy={report.hash}
        />
      </List.Section>
      {report.revert ? <RevertSection revert={report.revert} /> : null}
      {report.proxy ? <ProxySection proxy={report.proxy} cfg={{ ...cfg, chainId: cid }} /> : null}
      {report.decoded ? (
        <>
          <DecodedCallSection decoded={report.decoded} />
          {collectBatches(report.decoded).map((c, i) => (
            <BatchSection key={i} batch={c.batch!} label={c.functionName} />
          ))}
          <CandidatesSection candidates={report.decoded.candidates} current={rawSig(report.decoded)} />
        </>
      ) : report.input && report.input !== "0x" ? (
        <List.Section title="Decoded">
          <CopyRow
            id="nodata"
            icon={Icon.MagnifyingGlass}
            title="Couldn't decode this call"
            subtitle="no matching contract or function found"
          />
        </List.Section>
      ) : null}
      {report.authorizations.length ? (
        <List.Section title="EIP-7702 Delegations" subtitle="signed in this transaction">
          {report.authorizations.map((x, i) => (
            <CopyRow
              key={i}
              id={`authorization-${i}`}
              icon={{ source: Icon.Link, tintColor: Color.Purple }}
              title={x.authority ?? "Unknown signer"}
              subtitle={x.delegate ? `delegates to ${shortAddr(x.delegate)}` : "removes delegation"}
              url={x.delegate ? explorerUrl(cid, `address/${x.delegate}`) : undefined}
              copy={x.delegate ?? x.authority ?? ""}
            />
          ))}
        </List.Section>
      ) : null}
      <LogsSection logs={report.logs} cfg={{ ...cfg, chainId: cid }} />
    </>
  );
}

function ProxySection({ proxy, cfg }: { proxy: ProxyInfo; cfg: ReturnType<typeof getConfig> }) {
  return (
    <List.Section title="Proxy">
      <CopyRow
        id="impl"
        icon={{ source: Icon.Layers, tintColor: Color.Purple }}
        title={proxy.implementation}
        subtitle="implementation"
        tag={{ text: proxy.kind, color: Color.Purple }}
        url={explorerUrl(cfg.chainId, `address/${proxy.implementation}`)}
        copy={proxy.implementation}
      />
    </List.Section>
  );
}

function AddressView({ a, cfg }: { a: Extract<Analysis, { type: "address" }>; cfg: ReturnType<typeof getConfig> }) {
  return (
    <>
      <List.Section title="Address">
        <CopyRow
          id="checksum"
          icon={Icon.Wallet}
          title={a.checksum}
          subtitle="checksummed"
          tag={
            a.delegate
              ? { text: "Smart Wallet", color: Color.Purple }
              : { text: a.isContract ? "Contract" : "EOA", color: a.isContract ? Color.Blue : Color.SecondaryText }
          }
          url={explorerUrl(cfg.chainId, `address/${a.checksum}`)}
          copy={a.checksum}
        />
        {a.ens ? <CopyRow id="ens" icon={Icon.Globe} title={a.ens} subtitle="ENS (reverse)" copy={a.ens} /> : null}
      </List.Section>
      {a.delegate ? (
        <List.Section title="EIP-7702 Delegation" subtitle="a wallet that runs this contract's code">
          <CopyRow
            id="delegate"
            icon={{ source: Icon.Link, tintColor: Color.Purple }}
            title={a.delegate}
            subtitle="delegates to"
            url={explorerUrl(cfg.chainId, `address/${a.delegate}`)}
            copy={a.delegate}
          />
        </List.Section>
      ) : null}
      {a.multisig ? <MultisigSection ms={a.multisig} chainId={cfg.chainId} /> : null}
      {a.proxy ? <ProxySection proxy={a.proxy} cfg={cfg} /> : null}
      {a.otherChains.map((c) =>
        c.multisig ? (
          <MultisigSection key={c.chainId} ms={c.multisig} chainId={c.chainId} chainLabel={c.name} />
        ) : (
          <List.Section key={c.chainId} title="Found on other chains">
            <CopyRow
              id={`contract-${c.chainId}`}
              icon={{ source: Icon.Link, tintColor: Color.Blue }}
              title={c.delegate ? "Smart Wallet" : "Contract"}
              subtitle={c.delegate ? `EIP-7702 delegation on ${c.name}` : `deployed on ${c.name}`}
              tag={{ text: c.name, color: Color.Blue }}
              url={explorerUrl(c.chainId, `address/${a.checksum}`)}
              copy={a.checksum}
            />
          </List.Section>
        ),
      )}
    </>
  );
}

function multisigMarkdown(ms: MultisigInfo): string {
  const signers = ms.owners.map((o, i) => `${i + 1}. \`${o}\``).join("\n");
  return `## ${ms.kind}\n\n**${ms.threshold} of ${ms.owners.length}** signatures required to execute\n\n**Signers (${ms.owners.length})**\n${signers}${ms.nonce != null ? `\n\nnonce: ${ms.nonce}` : ""}`;
}

function MultisigSection({ ms, chainId, chainLabel }: { ms: MultisigInfo; chainId: number; chainLabel?: string }) {
  const rid = (s: string) => `ms-${chainId}-${s}`; // unique across chains
  return (
    <List.Section title="Multisig" subtitle={chainLabel ? `${ms.kind} · ${chainLabel}` : ms.kind}>
      <CopyRow
        id={rid("threshold")}
        icon={{ source: Icon.Shield, tintColor: Color.Green }}
        title={`${ms.threshold} of ${ms.owners.length}`}
        subtitle={chainLabel ? `threshold · on ${chainLabel}` : "threshold — signers required to execute"}
        tag={{ text: ms.kind, color: Color.Green }}
        copy={`${ms.threshold}/${ms.owners.length}`}
        detail={multisigMarkdown(ms)}
      />
      {ms.owners.map((o, i) => (
        <CopyRow
          key={o}
          id={rid(`owner-${i}`)}
          icon={Icon.Person}
          title={o}
          subtitle={`signer ${i + 1} of ${ms.owners.length}`}
          url={explorerUrl(chainId, `address/${o}`)}
          copy={o}
        />
      ))}
      {ms.nonce != null ? (
        <CopyRow id={rid("nonce")} icon={Icon.Hashtag} title={ms.nonce} subtitle="nonce" copy={ms.nonce} />
      ) : null}
    </List.Section>
  );
}

function EnsView({ name, address, cfg }: { name: string; address: Address | null; cfg: ReturnType<typeof getConfig> }) {
  if (!address) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Globe, tintColor: Color.Orange }}
        title="ENS name not found"
        description={`${name} does not resolve to an address`}
      />
    );
  }
  return (
    <List.Section title="ENS">
      <CopyRow
        id="resolved"
        icon={Icon.Wallet}
        title={address}
        subtitle={`resolves ${name}`}
        url={explorerUrl(cfg.chainId, `address/${address}`)}
        copy={address}
      />
    </List.Section>
  );
}

function ValueView({ input }: { input: string }) {
  const rows = convertUnits(input);
  if (rows.length === 0) {
    return (
      <List.EmptyView icon={Icon.Calculator} title="Nothing to convert" description="Type a number, hex, or string" />
    );
  }
  return (
    <List.Section title="Value">
      {rows.map((r) => (
        <CopyRow key={r.label} id={r.label} icon={Icon.Calculator} title={r.value} subtitle={r.label} copy={r.value} />
      ))}
    </List.Section>
  );
}

function solTransferTitle(t: SolTransfer): string {
  if (t.kind === "SOL") return `${t.amount} SOL`;
  return t.mint ? `${t.amount} · ${shortAddr(t.mint)}` : `${t.amount} raw units`;
}

function solTransferMarkdown(t: SolTransfer): string {
  return `## ${solTransferTitle(t)}\n\n| field | value |\n|---|---|\n| kind | ${t.kind} |\n| from | \`${t.from}\` |\n| to | \`${t.to}\` |\n| amount | ${escapePipes(t.amount)} |${t.mint ? `\n| mint | \`${t.mint}\` |` : ""}`;
}

function solIxMarkdown(ix: SolInstruction): string {
  const head = `## ${ix.program} · ${ix.summary}\n\n\`${ix.programId}\` · ${ix.source}\n`;
  const args = ix.args.length
    ? `\n| arg | value |\n|---|---|\n${ix.args.map((a) => `| ${a.name} | ${escapePipes(a.value)} |`).join("\n")}\n`
    : "\n_no decoded args_\n";
  const accts = ix.accounts.length ? `\n**accounts**\n${ix.accounts.map((a) => `- \`${a}\``).join("\n")}\n` : "";
  return head + args + accts;
}

function solIxTag(source: SolInstruction["source"]): { text: string; color: Color } {
  if (source === "anchor IDL") return { text: "Anchor", color: Color.Green };
  if (source === "parsed") return { text: "parsed", color: Color.Blue };
  return { text: "raw", color: Color.SecondaryText };
}

function solIxIcon(source: SolInstruction["source"]): Image.ImageLike {
  if (source === "anchor IDL") return { source: Icon.Code, tintColor: Color.Green };
  if (source === "parsed") return Icon.Dot;
  return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
}

function SolTxView({ report }: { report: SolTxReport }) {
  const { cluster } = getSolanaConfig();
  const statusTag =
    report.status === "success" ? { text: "Success", color: Color.Green } : { text: "Failed", color: Color.Red };
  return (
    <>
      <List.Section title="Solana Transaction">
        <CopyRow
          id="status"
          icon={
            report.status === "success"
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.XMarkCircle, tintColor: Color.Red }
          }
          title={report.status}
          subtitle={report.err ? `error: ${report.err}` : "status"}
          tag={statusTag}
          copy={report.status}
        />
        <CopyRow
          id="fee"
          icon={Icon.Coins}
          title={`${report.fee} SOL`}
          subtitle={`fee${report.computeUnits != null ? ` · ${report.computeUnits} CU` : ""}`}
          copy={report.fee}
        />
        {report.signer ? (
          <CopyRow
            id="signer"
            icon={Icon.Person}
            title={report.signer}
            subtitle="fee payer / signer"
            url={solscanUrl(cluster, `account/${report.signer}`)}
            copy={report.signer}
          />
        ) : null}
        <CopyRow
          id="slot"
          icon={Icon.Box}
          title={`${report.slot}${report.blockTime ? `  ·  ${new Date(report.blockTime * 1000).toUTCString()}` : ""}`}
          subtitle="slot"
          copy={String(report.slot)}
        />
        <CopyRow
          id="sig"
          icon={Icon.Link}
          title={report.signature}
          subtitle="signature"
          url={solscanUrl(cluster, `tx/${report.signature}`)}
          copy={report.signature}
        />
      </List.Section>
      {report.transfers.length ? (
        <List.Section title={`Transfers (${report.transfers.length})`}>
          {report.transfers.map((t, i) => (
            <CopyRow
              key={i}
              id={`xfer-${i}`}
              icon={
                t.kind === "SOL"
                  ? { source: Icon.Coins, tintColor: Color.Purple }
                  : { source: Icon.Coins, tintColor: Color.Yellow }
              }
              title={solTransferTitle(t)}
              subtitle={`${shortAddr(t.from)} → ${shortAddr(t.to)}`}
              tag={{ text: t.kind, color: t.kind === "SOL" ? Color.Purple : Color.Yellow }}
              copy={t.amount}
              detail={solTransferMarkdown(t)}
            />
          ))}
        </List.Section>
      ) : null}
      {report.instructions.length ? (
        <List.Section title={`Instructions (${report.instructions.length})`}>
          {report.instructions.map((ix) => (
            <CopyRow
              key={ix.index}
              id={`ix-${ix.index}`}
              icon={solIxIcon(ix.source)}
              title={`${ix.program} · ${ix.summary}`}
              subtitle={`#${ix.index}`}
              tag={solIxTag(ix.source)}
              url={solscanUrl(cluster, `account/${ix.programId}`)}
              copy={ix.programId}
              detail={solIxMarkdown(ix)}
            />
          ))}
        </List.Section>
      ) : null}
      {report.programs.length ? (
        <List.Section title="Programs">
          {report.programs.map((p) => (
            <CopyRow
              key={p.id}
              id={`prog-${p.id}`}
              icon={Icon.Cog}
              title={p.name}
              subtitle={p.id}
              url={solscanUrl(cluster, `account/${p.id}`)}
              copy={p.id}
            />
          ))}
        </List.Section>
      ) : null}
      {report.logs.length ? (
        <List.Section title="Logs">
          <CopyRow
            id="logs"
            icon={Icon.Document}
            title={`${report.logs.length} log lines`}
            subtitle="program logs"
            copy={report.logs.join("\n")}
            detail={`## Program logs\n\n\`\`\`\n${report.logs.join("\n")}\n\`\`\``}
          />
        </List.Section>
      ) : null}
    </>
  );
}

function SolAccountView({ account }: { account: SolAccount }) {
  const { cluster } = getSolanaConfig();
  if (!account.exists) {
    return (
      <List.EmptyView
        icon={{ source: Icon.Globe, tintColor: Color.Orange }}
        title="Account not found"
        description={`${account.address} has no on-chain data on this cluster`}
      />
    );
  }
  return (
    <List.Section title="Solana Account">
      <CopyRow
        id="addr"
        icon={Icon.Wallet}
        title={account.address}
        subtitle="address"
        url={solscanUrl(cluster, `account/${account.address}`)}
        copy={account.address}
      />
      <CopyRow
        id="bal"
        icon={Icon.Coins}
        title={`${account.lamports} SOL`}
        subtitle="balance"
        copy={account.lamports}
      />
      <CopyRow
        id="owner"
        icon={Icon.Cog}
        title={account.owner}
        subtitle="owner program"
        tag={account.executable ? { text: "executable", color: Color.Blue } : undefined}
        url={solscanUrl(cluster, `account/${account.owner}`)}
        copy={account.owner}
      />
    </List.Section>
  );
}

export default withSettings(Command);
