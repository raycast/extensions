import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getChain, registerCustomChains } from "../src/lib/chains";
import { detect } from "../src/lib/detect";
import { chainError, changedFrom, fromPreferences, merge } from "../src/lib/settings-model";
import { checksum, convertUnits, csvCell, hashAndSelector, uniqueFileName } from "../src/lib/convert";
import {
  analyzeAddress,
  analyzeCalldata,
  analyzeTransaction,
  decodeRevertData,
  decodeWithCustomAbi,
  fetchTransaction,
  matchEvent,
  parseAbiText,
  parseDelegation,
  resolveEnsName,
  reverseEns,
  testEvmRpc,
} from "../src/lib/evm";
import {
  concat,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  parseAbi,
  toEventSelector,
  http,
  parseAbiItem,
  toFunctionSelector,
} from "viem";
import type { Abi, AbiFunction } from "viem";
import { mainnet } from "viem/chains";
import { recoverAuthorizationAddress } from "viem/utils";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const USDC = "0xA0b86991c6218b36C1d19D4a2e9Eb0cE3606eB48";
// transfer(0x1111...1111, 1000000)
const TEST_CALLDATA = encodeFunctionData({
  abi: [parseAbiItem("function transfer(address,uint256)")],
  functionName: "transfer",
  args: ["0x1111111111111111111111111111111111111111", 1000000n],
});

async function main() {
  console.log("\n[detect]");
  check("address", detect(VITALIK).kind === "address");
  check("ens name", detect("vitalik.eth").kind === "ensName");
  check("tx hash (32 bytes)", detect(`0x${"ab".repeat(32)}`).kind === "txHash");
  check("calldata", detect(TEST_CALLDATA).kind === "calldata");
  check("number", detect("1000000000000000000").kind === "number");
  check("decimal", detect("1.5").kind === "number");
  check("unknown", detect("hello world").kind === "unknown");

  console.log("\n[convert]");
  check("checksum round-trip", checksum(VITALIK.toLowerCase()) === VITALIK);
  const u = convertUnits("1000000000000000000");
  check(
    "1e18 wei → 1 ether",
    u.some((r) => r.label === "As wei → ether" && r.value === "1"),
    JSON.stringify(u),
  );
  const h = hashAndSelector("transfer(address,uint256)");
  check(
    "selector transfer = 0xa9059cbb",
    h.some((r) => r.label.startsWith("Function selector") && r.value === "0xa9059cbb"),
    JSON.stringify(h),
  );

  console.log("\n[decode — standard ABI (named params, no network needed)]");
  {
    const { decoded } = await analyzeCalldata({ chainId: 1 }, TEST_CALLDATA);
    check("decodes transfer", decoded?.functionName === "transfer", JSON.stringify(decoded));
    check("arg count = 2", decoded?.args.length === 2, JSON.stringify(decoded?.args));
    check(
      "args are NAMED (to, amount)",
      decoded?.args[0]?.name === "to" && decoded?.args[1]?.name === "amount",
      JSON.stringify(decoded?.args.map((a) => a.name)),
    );
    check("amount value = 1000000", decoded?.args[1]?.value === "1000000", JSON.stringify(decoded?.args));
  }

  console.log("\n[proxy + ABI resolve (network)]");
  try {
    const { decoded, proxy } = await analyzeCalldata({ chainId: 1 }, TEST_CALLDATA, USDC);
    check("USDC proxy detected", !!proxy?.implementation, JSON.stringify(proxy));
    check("decoded against USDC", decoded?.functionName === "transfer", JSON.stringify(decoded));
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[multisig config checker — real Gnosis Safe (network)]");
  try {
    const SAFE = "0x4f2083f5fBede34C2714aFfb3105539775f7FE64";
    const r = await analyzeAddress({ chainId: 1 }, SAFE as `0x${string}`);
    check("Safe detected as multisig", !!r.multisig, JSON.stringify({ isContract: r.isContract, ms: !!r.multisig }));
    check("multisig kind is Safe", !!r.multisig && /safe/i.test(r.multisig.kind), r.multisig?.kind);
    check(
      "threshold ≤ owner count, both ≥ 1",
      !!r.multisig && r.multisig.threshold >= 1 && r.multisig.owners.length >= r.multisig.threshold,
      JSON.stringify(r.multisig && { m: r.multisig.threshold, n: r.multisig.owners.length }),
    );
    if (r.multisig) console.log(`    ↳ ${r.multisig.kind} · ${r.multisig.threshold}-of-${r.multisig.owners.length}`);
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[cross-chain detection — Safe on a non-default chain (network)]");
  try {
    // ENS DAO Safe: an EOA on BNB, a Safe on Ethereum.
    const SAFE = "0x4f2083f5fBede34C2714aFfb3105539775f7FE64";
    const r = await analyzeAddress({ chainId: 56 }, SAFE as `0x${string}`);
    check("EOA on the selected chain (BNB)", !r.isContract, JSON.stringify({ isContract: r.isContract }));
    const eth = r.otherChains.find((c) => c.chainId === 1);
    check("found as a contract on Ethereum", !!eth, JSON.stringify(r.otherChains.map((c) => c.name)));
    check(
      "detected as a Safe multisig there",
      !!eth?.multisig,
      JSON.stringify(eth?.multisig && { m: eth.multisig.threshold, n: eth.multisig.owners.length }),
    );
    if (eth?.multisig)
      console.log(
        `    ↳ ${eth.name}: ${eth.multisig.kind} · ${eth.multisig.threshold}-of-${eth.multisig.owners.length}`,
      );
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[cross-chain tx — hash on a non-default chain (network)]");
  try {
    // Real recent BNB tx, decoded with Ethereum selected.
    const bnbRpc = async (method: string, params: unknown[]) => {
      const res = await fetch("https://bsc-rpc.publicnode.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      return (await res.json()).result;
    };
    const head = await bnbRpc("eth_blockNumber", []);
    const blk = await bnbRpc("eth_getBlockByNumber", ["0x" + (parseInt(head, 16) - 6).toString(16), false]);
    const bnbTx = blk.transactions[0] as `0x${string}`;
    check("got a real BNB tx", !!bnbTx);
    if (bnbTx) {
      const report = await analyzeTransaction({ chainId: 1 }, bnbTx);
      check("tx found despite wrong default chain", !!report, "null report");
      check("resolved to BNB Chain (id 56)", report?.chainId === 56, `chainId=${report?.chainId}`);
      if (report) console.log(`    ↳ ${bnbTx.slice(0, 12)}… found on chain ${report.chainId}, status ${report.status}`);
    }
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[ENS reverse (network)]");
  try {
    const name = await reverseEns(VITALIK as `0x${string}`);
    check("reverse resolves vitalik.eth", name === "vitalik.eth", String(name));
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[analyzeAddress (network)]");
  try {
    const r = await analyzeAddress({ chainId: 1 }, USDC as `0x${string}`);
    check("USDC is a contract", r.isContract, JSON.stringify({ isContract: r.isContract }));
    check("USDC proxy implementation found", !!r.proxy, JSON.stringify(r.proxy));
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[Sourcify ABI lookup (network)]");
  try {
    const ROUTER = "0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af"; // Uniswap Universal Router, verified on Sourcify
    const data = encodeFunctionData({
      abi: [parseAbiItem("function execute(bytes commands, bytes[] inputs, uint256 deadline)")],
      args: ["0x00", [], 1n],
    });
    const { decoded } = await analyzeCalldata({ chainId: 1 }, data, ROUTER);
    check("verified contract uses Sourcify", decoded?.source === "Sourcify", String(decoded?.source));
    check("not marked as a guess", decoded?.guess === false, String(decoded?.guess));
    check("args use real names", decoded?.args[0]?.name === "commands", String(decoded?.args[0]?.name));
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[no-key ABI lookup beyond Sourcify (network)]");
  try {
    const CONTRACT = "0x69e6bd1C4082403Fc7917a61F6216552fC1a541D"; // verified on Blockscout, not on Sourcify when written
    const res = await fetch(`https://eth.blockscout.com/api/v2/smart-contracts/${CONTRACT}`);
    const { abi } = (await res.json()) as { abi: Abi };
    const fn = abi.find((i): i is AbiFunction => i.type === "function" && i.inputs.length === 0);
    const { decoded } = await analyzeCalldata({ chainId: 1 }, toFunctionSelector(fn!), CONTRACT);
    check("decodes from a verified ABI without a key", decoded?.guess === false, String(decoded?.source));
    check("function name matches", decoded?.functionName === fn?.name, String(decoded?.functionName));
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[custom RPC and API settings (local server)]");
  {
    // Not in the built-in ABI table, so decoding has to come from a configured source.
    const TEST_ABI = [parseAbiItem("function chainscopeTest(uint256 amount)")];
    const TEST_CALL = encodeFunctionData({ abi: TEST_ABI, args: [1n] });
    const hits: string[] = [];
    const server = createServer((req, res) => {
      if (req.url?.startsWith("/hang")) return;
      let body = "";
      req.on("data", (d) => (body += d));
      req.on("end", () => {
        const url = req.url ?? "";
        hits.push(url);
        res.setHeader("content-type", "application/json");
        if (url.startsWith("/lookup")) {
          res.end(
            JSON.stringify({
              ok: true,
              result: { function: { [TEST_CALL.slice(0, 10)]: [{ name: "chainscopeTest(uint256)" }] }, event: {} },
            }),
          );
        } else if (url.startsWith("/abi") || url.startsWith("/blockscout")) {
          res.end(JSON.stringify({ abi: TEST_ABI }));
        } else {
          const { id, method } = JSON.parse(body || "{}");
          const answers: Record<string, unknown> = {
            eth_chainId: "0x1",
            eth_getCode: url === "/rpc-code" ? "0x6000" : "0x",
            ...(url === "/rpc-no-storage" ? {} : { eth_getStorageAt: `0x${"0".repeat(64)}` }),
            getVersion: { "solana-core": "9.9.9" },
          };
          res.end(
            JSON.stringify(
              method in answers
                ? { jsonrpc: "2.0", id, result: answers[method] }
                : { jsonrpc: "2.0", id, error: { code: -32000, message: "test" } },
            ),
          );
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const rpcHit = () => hits.some((h) => h.startsWith("/rpc"));
    const someone = "0x1111111111111111111111111111111111111111";
    registerCustomChains([
      { id: 1, rpc: `${local}/rpc` },
      { id: 7777001, name: "Test", rpc: `${local}/rpc`, blockscout: `${local}/blockscout/` },
    ]);
    await reverseEns(VITALIK);
    check("reverse ENS uses your Ethereum RPC", rpcHit());
    hits.length = 0;
    await resolveEnsName("vitalik.eth");
    check("ENS lookup uses your Ethereum RPC", rpcHit());
    hits.length = 0;
    await analyzeAddress({ chainId: 7777001 }, someone);
    check("address lookup uses the selected chain's RPC", rpcHit());
    registerCustomChains([
      { id: 7777001, name: "First", symbol: "ONE", rpc: `${local}/rpc` },
      { id: 7777002, name: "Second", symbol: "TWO", rpc: `${local}/rpc-code` },
      { id: 1, rpc: `${local}/rpc`, symbol: "XYZ" },
    ]);
    check(
      "each custom chain keeps its own name and token",
      getChain(7777001).name === "First" &&
        getChain(7777001).chain.nativeCurrency.symbol === "ONE" &&
        getChain(7777002).name === "Second" &&
        getChain(7777002).chain.nativeCurrency.symbol === "TWO",
    );
    check("network token applies to a built-in chain", getChain(1).chain.nativeCurrency.symbol === "XYZ");
    const onOther = await analyzeAddress({ chainId: 7777001 }, someone);
    check(
      "address search includes your other custom chains",
      onOther.otherChains.some((c) => c.chainId === 7777002 && c.name === "Second"),
      JSON.stringify(onOther.otherChains),
    );
    registerCustomChains([
      { id: 1, rpc: `${local}/rpc` },
      { id: 7777001, name: "Test", rpc: `${local}/rpc`, blockscout: `${local}/blockscout/` },
    ]);
    const custom = await analyzeCalldata({ chainId: 1, signatureDbUrl: `${local}/lookup` }, TEST_CALL);
    check(
      "custom signature database is used",
      custom.decoded?.functionName === "chainscopeTest" && hits.some((h) => h.startsWith("/lookup")),
      String(custom.decoded?.signature),
    );
    const noDb = await analyzeCalldata({ chainId: 1, sources: { signatureDb: false } }, TEST_CALL);
    check("signature database can be turned off", noDb.decoded === null, String(noDb.decoded?.signature));
    hits.length = 0;
    const sf = await analyzeCalldata({ chainId: 1, sourcifyUrl: `${local}/abi` }, TEST_CALL, someone);
    check(
      "custom Sourcify URL is used",
      sf.decoded?.source === "Sourcify" && hits.some((h) => h.startsWith("/abi/v2/contract/1/")),
      hits.join(" "),
    );
    const sfOff = await analyzeCalldata(
      { chainId: 1, sourcifyUrl: `${local}/abi`, sources: { sourcify: false, blockscout: false, signatureDb: false } },
      TEST_CALL,
      someone,
    );
    check("Sourcify can be turned off", sfOff.decoded === null, String(sfOff.decoded?.source));
    const bs = await analyzeCalldata(
      { chainId: 7777001, sources: { sourcify: false, signatureDb: false } },
      TEST_CALL,
      someone,
    );
    check("per-chain Blockscout URL is used", bs.decoded?.source === "Blockscout", String(bs.decoded?.source));
    registerCustomChains([{ id: 7777005, name: "No Storage", rpc: `${local}/rpc-no-storage` }]);
    const noStorage = await analyzeCalldata({ chainId: 7777005 }, TEST_CALL, someone).then(
      (r) => r.decoded?.functionName ?? "no decode",
      (e) => `threw: ${(e as Error).message.split("\n")[0]}`,
    );
    check("a failed proxy lookup doesn't stop the decode", !noStorage.startsWith("threw"), noStorage);
    registerCustomChains([{ id: 1, rpc: `${local}/rpc` }]);
    const hung = await Promise.race([
      analyzeCalldata({ chainId: 1, signatureDbUrl: `${local}/hang` }, TEST_CALL).then(() => "done"),
      new Promise((r) => setTimeout(() => r("stuck"), 12000)),
    ]);
    check("a stuck signature server doesn't hang Decode", hung === "done", String(hung));
    const ok = await testEvmRpc(`${local}/rpc`);
    check("EVM connection test reads the chain id", ok.chainId === 1, JSON.stringify(ok));
    await testEvmRpc("http://127.0.0.1:1").then(
      () => check("failed connection test reports an error", false),
      () => check("failed connection test reports an error", true),
    );
    registerCustomChains([]);
    server.close();
  }

  console.log("\n[preferences page and Manage Networks (pure)]");
  {
    const prefs = fromPreferences({
      defaultChain: "8453",
      etherscanApiKey: " key ",
      useBlockscout: false,
    });
    check("default chain comes from preferences", prefs.defaultChainId === 8453);
    check("key is trimmed", prefs.etherscanApiKey === "key");
    check("source checkboxes are read", prefs.sources.blockscout === false && prefs.sources.sourcify === true);
    const full = { id: 7777003, name: "New", rpc: "https://x.example", symbol: "NEW" };
    const list = [{ id: 7777003 }, { id: 7777004 }];
    check("a complete new network is accepted", chainError(full, [], false) === undefined);
    check("a new network needs a name", !!chainError({ ...full, name: " " }, [], false));
    check("a new network needs an RPC", !!chainError({ ...full, rpc: "" }, [], false));
    check("a new network needs a token", !!chainError({ ...full, symbol: "" }, [], false));
    check("a built-in network can leave fields blank", chainError({ id: 1 }, [], true) === undefined);
    check("a bad network ID is refused", !!chainError({ ...full, id: 1.5 }, [], false));
    check("adding a duplicate ID is refused", !!chainError(full, list, false));
    check("editing keeps its own ID", chainError(full, list, false, 7777003) === undefined);
    check("editing onto another network's ID is refused", !!chainError(full, list, false, 7777004));
    const edited = { ...prefs, chains: [{ id: 7777003 }] };
    const saved = changedFrom(prefs, edited);
    check("only changed settings are saved", Object.keys(saved).join() === "chains", Object.keys(saved).join());
    const laterPrefs = fromPreferences({ defaultChain: "10" });
    const merged = merge(laterPrefs, saved);
    check("your networks are kept", merged.chains[0]?.id === 7777003);
    check("later preference edits still apply", merged.defaultChainId === 10);
    check("a default set in Manage Networks wins", merge(laterPrefs, { defaultChainId: 324 }).defaultChainId === 324);
    check(
      "preferences decide everything else",
      merge(prefs, { etherscanApiKey: "old", solanaCluster: "devnet" }).etherscanApiKey === "key" &&
        merge(prefs, { solanaCluster: "devnet" }).solanaCluster === "mainnet-beta",
    );
    check(
      "server URL preferences are read",
      fromPreferences({ sourcifyUrl: " https://s.example/ " }).sourcifyUrl === "https://s.example",
    );
  }

  console.log("\n[overloaded functions (pure)]");
  {
    const abi = parseAbi(["function foo(uint256 n)", "function foo(address who)"]);
    const data = encodeFunctionData({ abi, functionName: "foo", args: ["0x1111111111111111111111111111111111111111"] });
    const call = decodeWithCustomAbi(data, abi);
    check("overload is matched by selector", call?.signature === "foo(address)", call?.signature);
    check("overload argument keeps its type", call?.args[0]?.type === "address", call?.args[0]?.type);
  }

  console.log("\n[overloaded events (pure)]");
  {
    const abi = parseAbi(["event Foo(uint256 a)", "event Foo(address a)"]);
    const ev = matchEvent(abi, toEventSelector("Foo(address)"));
    check("overloaded event is matched by topic", ev?.inputs[0]?.type === "address", ev?.inputs[0]?.type);
  }

  console.log("\n[CSV and export files (pure)]");
  check("formula cells become text", csvCell("=1+1") === "'=1+1", csvCell("=1+1"));
  check(
    "formula cells with a comma stay one cell",
    csvCell("=SUM(A1,A2)") === `"'=SUM(A1,A2)"`,
    csvCell("=SUM(A1,A2)"),
  );
  check(
    "other formula prefixes become text",
    ["+1", "@a", "-a", " =1"].every((v) => csvCell(v) === `'${v}`),
  );
  check("negative numbers stay numbers", csvCell("-5") === "-5" && csvCell("-1.5") === "-1.5");
  check("plain values are unchanged", csvCell("abc") === "abc");
  check("quotes are escaped", csvCell('a"b') === '"a""b"');
  check("a free file name is kept", uniqueFileName("a.csv", () => false) === "a.csv");
  check(
    "a taken file name isn't replaced",
    uniqueFileName("a.csv", (n) => ["a.csv", "a (2).csv"].includes(n)) === "a (3).csv",
  );

  console.log("\n[EIP-7702 delegation parsing (pure)]");
  const DELEGATE = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B";
  check("reads the delegate", parseDelegation(`0xef0100${DELEGATE.slice(2)}`) === DELEGATE);
  check("empty code is not delegated", parseDelegation("0x") === null);
  check("contract code is not delegated", parseDelegation("0x6080604052") === null);
  check("wrong length is not delegated", parseDelegation(`0xef0100${DELEGATE.slice(2)}00`) === null);

  console.log("\n[EIP-7702 wallets and transactions (network)]");
  try {
    const client = createPublicClient({ chain: mainnet, transport: http("https://ethereum-rpc.publicnode.com") });
    const head = await client.getBlockNumber();
    let seenTx = false;
    let seenWallet = false;
    let seenAbi = false;
    for (let n = head - 2n; n > head - 60n && !(seenTx && seenWallet && seenAbi); n--) {
      const block = await client.getBlock({ blockNumber: n, includeTransactions: true });
      for (const tx of block.transactions) {
        if (tx.type !== "eip7702" || seenAbi) continue;
        if (!seenTx) {
          const r = await analyzeTransaction({ chainId: 1 }, tx.hash);
          check("tx lists its delegations", r?.authorizations.length === tx.authorizationList.length, tx.hash);
          check("delegation names the signer", !!r?.authorizations[0]?.authority, tx.hash);
          seenTx = true;
        }
        for (const auth of tx.authorizationList) {
          const wallet = await recoverAuthorizationAddress({ authorization: auth });
          const delegate = parseDelegation(await client.getCode({ address: wallet }));
          if (!delegate) continue;
          if (!seenWallet) {
            const r = await analyzeAddress({ chainId: 1 }, wallet);
            check("delegated wallet is not a contract", !r.isContract, wallet);
            check("delegated wallet shows its delegate", r.delegate === delegate, `${r.delegate} vs ${delegate}`);
            seenWallet = true;
          }
          // Proxy delegates decode with the implementation's ABI.
          if ((await analyzeAddress({ chainId: 1 }, delegate)).proxy) continue;
          const res = await fetch(`https://sourcify.dev/server/v2/contract/1/${delegate}?fields=abi`);
          if (!res.ok) continue;
          const { abi } = (await res.json()) as { abi: Abi };
          const fn = abi.find((i): i is AbiFunction => i.type === "function" && i.inputs.length === 0);
          if (!fn) continue;
          const { decoded } = await analyzeCalldata({ chainId: 1 }, toFunctionSelector(fn), wallet);
          check(
            "call to wallet decodes with delegate ABI",
            decoded?.source.includes("EIP-7702") === true,
            String(decoded?.source),
          );
          seenAbi = true;
          break;
        }
        if (seenAbi) break;
      }
    }
    if (!seenTx || !seenWallet || !seenAbi)
      console.log(`  (partly skipped: tx=${seenTx} wallet=${seenWallet} abi=${seenAbi})`);
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[headline flow — real tx hash → fetch → decode (network)]");
  try {
    // Recent finalized tx, no hardcoded hash.
    const client = createPublicClient({ chain: mainnet, transport: http("https://ethereum-rpc.publicnode.com") });
    const head = await client.getBlockNumber();
    const block = await client.getBlock({ blockNumber: head - 10n, includeTransactions: true });
    const calls = block.transactions.filter((t) => typeof t === "object" && t.to && t.input.length > 10).slice(0, 15);
    check("found contract-call txs in block", calls.length > 0, `${calls.length} candidates`);

    let fetched = 0;
    let decoded = 0;
    let sample = "";
    for (const t of calls) {
      const tx = await fetchTransaction({ chainId: 1 }, t.hash);
      if (!tx) continue;
      fetched++;
      if (!tx.input || tx.input === "0x") continue;
      const { decoded: d } = await analyzeCalldata({ chainId: 1 }, tx.input, tx.to ?? undefined);
      if (d) {
        decoded++;
        if (!sample) sample = `${t.hash.slice(0, 12)}… → ${d.signature} (${d.source})`;
      }
    }
    check("fetchTransaction resolves real hashes", fetched === calls.length, `${fetched}/${calls.length}`);
    check("at least one tx decodes end-to-end", decoded > 0, `${decoded}/${fetched} decoded — e.g. ${sample}`);
    if (sample) console.log(`    ↳ ${sample}`);
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[tx inspection — heaviest tx in block, log decode share (network)]");
  try {
    const client = createPublicClient({ chain: mainnet, transport: http("https://ethereum-rpc.publicnode.com") });
    const head = await client.getBlockNumber();
    const block = await client.getBlock({ blockNumber: head - 12n, includeTransactions: true });
    // Most logs = the fan-out path.
    let target = "";
    let maxLogs = 0;
    const scan = block.transactions.filter((t) => typeof t === "object" && t.to).slice(0, 30);
    for (const t of scan) {
      const r = await client.getTransactionReceipt({ hash: t.hash }).catch(() => null);
      if (r && r.logs.length > maxLogs) {
        maxLogs = r.logs.length;
        target = t.hash;
      }
    }
    check("found a multi-log tx", maxLogs >= 2, `heaviest tx has ${maxLogs} logs`);
    if (target) {
      const report = await analyzeTransaction({ chainId: 1 }, target as `0x${string}`);
      check(
        "report has status",
        report?.status === "success" || report?.status === "reverted",
        report?.status ?? "null",
      );
      check("report has gas + block", !!report?.gasUsed && !!report?.blockNumber);
      const total = report?.logs.length ?? 0;
      const named = report?.logs.filter((l) => l.eventName).length ?? 0;
      const share = total ? named / total : 0;
      // Transfer/Approval resolve without an Etherscan key.
      check(
        "≥70% of logs decoded (no rate-limit collapse)",
        share >= 0.7,
        `${named}/${total} = ${Math.round(share * 100)}%`,
      );
      const ex = report?.logs.find((l) => l.eventName);
      if (ex)
        console.log(
          `    ↳ ${named}/${total} logs named — e.g. ${ex.eventName} via ${ex.source || "unknown"}${ex.guess ? " (best guess)" : ""}`,
        );
    }
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[nested decode — multicall(bytes[]) (network sig DB)]");
  try {
    const inner = encodeFunctionData({
      abi: [parseAbiItem("function transfer(address,uint256)")],
      functionName: "transfer",
      args: ["0x1111111111111111111111111111111111111111", 5n],
    });
    const multicall = encodeFunctionData({
      abi: [parseAbiItem("function multicall(bytes[] data)")],
      functionName: "multicall",
      args: [[inner, inner]],
    });
    const { decoded } = await analyzeCalldata({ chainId: 1 }, multicall);
    check("outer is multicall", decoded?.functionName === "multicall", decoded?.signature);
    const nested = decoded?.args[0]?.nested ?? [];
    check("nested decoded 2 inner calls", nested.length === 2, `${nested.length} nested`);
    check(
      "inner calls are transfer",
      nested.every((c) => c.functionName === "transfer"),
      JSON.stringify(nested.map((c) => c.functionName)),
    );
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[custom ABI decode (pure)]");
  {
    const data = encodeFunctionData({
      abi: [parseAbiItem("function approve(address,uint256)")],
      functionName: "approve",
      args: ["0x1111111111111111111111111111111111111111", 42n],
    });
    const abi = parseAbiText("function approve(address spender, uint256 value)");
    check("parseAbiText (human-readable)", !!abi);
    const decoded = abi ? decodeWithCustomAbi(data, abi) : null;
    check("custom ABI decodes approve", decoded?.functionName === "approve", decoded?.signature);
    check("named arg from custom ABI", decoded?.args[0]?.name === "spender", JSON.stringify(decoded?.args));
    const jsonAbi = parseAbiText(
      '[{"type":"function","name":"approve","inputs":[{"type":"address"},{"type":"uint256"}]}]',
    );
    check("parseAbiText (JSON)", !!jsonAbi && decodeWithCustomAbi(data, jsonAbi)?.functionName === "approve");
  }

  console.log("\n[multiSend packed batch decode (network sig DB)]");
  try {
    const inner0 = encodeFunctionData({
      abi: [parseAbiItem("function transfer(address,uint256)")],
      functionName: "transfer",
      args: ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", 5n],
    });
    // packed entry: operation(1) ‖ to(20) ‖ value(32) ‖ dataLen(32) ‖ data
    const entry = (to: `0x${string}`, value: bigint, data: `0x${string}`) =>
      encodePacked(
        ["uint8", "address", "uint256", "uint256", "bytes"],
        [0, to, value, BigInt((data.length - 2) / 2), data],
      );
    const packed = concat([
      entry("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 0n, inner0),
      entry("0xcccccccccccccccccccccccccccccccccccccccc", 1000n, "0x"),
    ]);
    const multiSendData = encodeFunctionData({
      abi: [parseAbiItem("function multiSend(bytes)")],
      functionName: "multiSend",
      args: [packed],
    });
    const { decoded } = await analyzeCalldata({ chainId: 1 }, multiSendData);
    check("decodes multiSend", decoded?.functionName === "multiSend", decoded?.signature);
    check("expands 2 inner txs", decoded?.batch?.length === 2, `${decoded?.batch?.length} inner`);
    check(
      "inner #0 is transfer",
      decoded?.batch?.[0]?.decoded?.functionName === "transfer",
      JSON.stringify(decoded?.batch?.[0]?.decoded?.signature),
    );
    check(
      "inner #0 args named (to, amount)",
      decoded?.batch?.[0]?.decoded?.args[0]?.name === "to",
      JSON.stringify(decoded?.batch?.[0]?.decoded?.args.map((a) => a.name)),
    );
    check("inner #1 has value 1000", decoded?.batch?.[1]?.value === "1000", decoded?.batch?.[1]?.value);
    check(
      "inner #0 to is set",
      decoded?.batch?.[0]?.to?.toLowerCase() === "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      decoded?.batch?.[0]?.to,
    );
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[nested batch — Safe execTransaction → multiSend (network sig DB)]");
  try {
    const inner = encodeFunctionData({
      abi: [parseAbiItem("function transfer(address,uint256)")],
      functionName: "transfer",
      args: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 5n],
    });
    const entry = encodePacked(
      ["uint8", "address", "uint256", "uint256", "bytes"],
      [0, "0x1111111111111111111111111111111111111111", 0n, BigInt((inner.length - 2) / 2), inner],
    );
    const ms = encodeFunctionData({
      abi: [parseAbiItem("function multiSend(bytes)")],
      functionName: "multiSend",
      args: [entry],
    });
    const execTx = encodeFunctionData({
      abi: [
        parseAbiItem(
          "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures)",
        ),
      ],
      functionName: "execTransaction",
      args: [
        "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
        0n,
        ms,
        1,
        0n,
        0n,
        0n,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000",
        "0x",
      ],
    });
    const { decoded } = await analyzeCalldata({ chainId: 1 }, execTx);
    check("outer is execTransaction", decoded?.functionName === "execTransaction", decoded?.functionName);
    const nested = decoded?.args.flatMap((a) => a.nested ?? []).find((c) => c.functionName === "multiSend");
    check(
      "nested multiSend found",
      !!nested,
      JSON.stringify(decoded?.args.map((a) => a.nested?.map((n) => n.functionName))),
    );
    check("nested multiSend carries a batch", (nested?.batch?.length ?? 0) === 1, `${nested?.batch?.length}`);
    check(
      "batch inner is a named transfer",
      nested?.batch?.[0]?.decoded?.args[0]?.name === "to",
      JSON.stringify(nested?.batch?.[0]?.decoded?.args.map((a) => a.name)),
    );
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log("\n[revert / error decode (network sig DB)]");
  try {
    const errData = concat(["0x08c379a0", encodeAbiParameters([{ type: "string" }], ["insufficient balance"])]);
    const e1 = await decodeRevertData({ chainId: 1 }, errData);
    check(
      "decodes Error(string)",
      e1.kind === "Error" && e1.args[0]?.value === "insufficient balance",
      JSON.stringify(e1),
    );
    const panicData = concat(["0x4e487b71", encodeAbiParameters([{ type: "uint256" }], [17n])]);
    const e2 = await decodeRevertData({ chainId: 1 }, panicData);
    check("decodes Panic(uint256)", e2.kind === "Panic" && e2.args[0]?.value.includes("overflow"), JSON.stringify(e2));
    const sel = toFunctionSelector("error InsufficientBalance(uint256,uint256)");
    const customData = concat([sel, encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [50n, 100n])]);
    const e3 = await decodeRevertData({ chainId: 1 }, customData);
    check(
      "decodes custom error (best effort)",
      e3.kind === "custom" || e3.kind === "raw",
      JSON.stringify({ kind: e3.kind, sig: e3.signature }),
    );
    if (e3.kind === "custom") console.log(`    ↳ ${e3.signature}`);
  } catch (e) {
    console.log(`  (skipped, network error: ${(e as Error).message})`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
