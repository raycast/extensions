import { detect } from "../src/lib/detect";
import { solanaRpcFor } from "../src/lib/settings-model";
import { analyzeSolanaAddress, analyzeSolanaTransaction, collectTransfers, tokenInfoByAccount } from "../src/lib/svm";

const RPC = process.env.SOLANA_RPC || "https://solana-rpc.publicnode.com";

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = (await r.json()) as { result?: T; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.result as T;
}
async function recentSig(program: string): Promise<string | undefined> {
  const sigs = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [program, { limit: 8 }]);
  return sigs.find((s) => !s.err)?.signature ?? sigs[0]?.signature;
}
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

let pass = 0,
  fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  console.log("\n[detect — Solana]");
  check(
    "token program is a Solana address",
    detect(TOKEN_PROGRAM).kind === "solanaAddress",
    detect(TOKEN_PROGRAM).kind,
  );
  check("EVM address still wins", detect("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045").kind === "address");
  check("number not mistaken for base58", detect("123456789").kind === "number");

  console.log("\n[Solana account (network)]");
  try {
    const acct = await analyzeSolanaAddress({ rpc: RPC, cluster: "mainnet-beta" }, TOKEN_PROGRAM);
    check("token program account exists", !!acct?.exists, JSON.stringify(acct));
    check("token program is executable", acct?.executable === true, String(acct?.executable));
  } catch (e) {
    console.log(`  (skipped: ${(e as Error).message})`);
  }

  console.log("\n[Solana tx — real signature pulled at runtime (network)]");
  try {
    const target = await recentSig(TOKEN_PROGRAM);
    check("found a recent signature", !!target);
    if (target) {
      check("signature detected as solanaSig", detect(target).kind === "solanaSig", `${target.length} chars`);
      const r = await analyzeSolanaTransaction({ rpc: RPC, cluster: "mainnet-beta" }, target);
      check("report returned", !!r, "null report");
      check("status resolved", r?.status === "success" || r?.status === "failed", r?.status);
      check("fee present", !!r && Number(r.fee) >= 0, r?.fee);
      check("has programs", (r?.programs.length ?? 0) > 0, `${r?.programs.length}`);
      check("has instructions", (r?.instructions.length ?? 0) > 0, `${r?.instructions.length}`);
      const anchorDecoded = r?.instructions.filter((i) => i.source === "anchor IDL").length ?? 0;
      console.log(
        `    ↳ ${r?.instructions.length} ix (${anchorDecoded} via Anchor IDL), ${r?.transfers.length} transfers, ${r?.programs.length} programs`,
      );
      if (r?.transfers[0])
        console.log(
          `    ↳ transfer: ${r.transfers[0].amount} ${r.transfers[0].kind} ${r.transfers[0].from.slice(0, 6)}…→${r.transfers[0].to.slice(0, 6)}…`,
        );
    }
  } catch (e) {
    console.log(`  (skipped: ${(e as Error).message})`);
  }

  console.log("\n[Anchor IDL decode — real Jupiter v6 swap (network)]");
  try {
    // Jupiter is often called from inside another program; this test needs a top-level call.
    const sigs = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [JUPITER, { limit: 25 }]);
    let r: Awaited<ReturnType<typeof analyzeSolanaTransaction>> = null;
    for (const s of sigs.filter((x) => !x.err)) {
      r = await analyzeSolanaTransaction({ rpc: RPC, cluster: "mainnet-beta" }, s.signature);
      if (r?.instructions.some((i) => i.programId === JUPITER)) break;
      r = null;
    }
    if (!r) {
      console.log("  (skipped: no recent top-level Jupiter call)");
    } else {
      const jup = r.instructions.find((i) => i.programId === JUPITER);
      if (r.transfers.some((t) => t.kind === "SPL"))
        check(
          "programs include the token program called inside Jupiter",
          r.programs.some((p) => p.name.startsWith("SPL Token")),
          r.programs.map((p) => p.name).join(),
        );
      check("Jupiter instruction present", !!jup, JSON.stringify(jup?.summary));
      check("decoded via Anchor IDL", jup?.source === "anchor IDL", `source=${jup?.source}`);
      // Some Jupiter instructions take no args.
      const argsNamed = !jup?.args.length || jup.args.every((a) => a.name && !/^arg\d+$/.test(a.name));
      check("Anchor args are named when present", argsNamed, JSON.stringify(jup?.args.map((a) => a.name)));
      if (jup) console.log(`    ↳ ${jup.program}.${jup.summary}(${jup.args.map((a) => a.name).join(", ")})`);
    }
  } catch (e) {
    console.log(`  (skipped: ${(e as Error).message})`);
  }

  console.log("\n[Solana v1 transaction format (network)]");
  try {
    const list = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [JUPITER, { limit: 40 }]);
    let v1: { signature: string; ixCount: number; feePayer: unknown } | undefined;
    for (const s of list.filter((x) => !x.err)) {
      const raw = await rpc<{
        version: unknown;
        transaction: { message: { instructions: unknown[]; accountKeys: { pubkey: string }[] } };
      } | null>("getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 255, commitment: "confirmed" },
      ]);
      if (raw?.version === 1) {
        v1 = {
          signature: s.signature,
          ixCount: raw.transaction.message.instructions.length,
          feePayer: raw.transaction.message.accountKeys[0]?.pubkey,
        };
        break;
      }
    }
    if (!v1) {
      console.log("  (skipped: no recent v1 transaction)");
    } else {
      const r = await analyzeSolanaTransaction({ rpc: RPC, cluster: "mainnet-beta" }, v1.signature);
      check("v1 tx returns a report", !!r, v1.signature);
      check(
        "v1 tx has every top-level instruction",
        r?.instructions.length === v1.ixCount,
        `${r?.instructions.length} vs ${v1.ixCount}`,
      );
      check("v1 tx has a status", !!r?.status, String(r?.status));
      check("v1 tx has a fee payer", !!v1.feePayer && r?.signer === v1.feePayer, `${r?.signer} vs ${v1.feePayer}`);
      if (r)
        console.log(
          `    ↳ v1: ${r.instructions.length} ix, ${r.transfers.length} transfers, ${r.programs.length} programs`,
        );
    }
  } catch (e) {
    console.log(`  (skipped: ${(e as Error).message})`);
  }

  console.log("\n[SPL transfer amounts (pure)]");
  {
    const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const tokens = tokenInfoByAccount(
      [{ pubkey: "payer" }, { pubkey: "from" }, { pubkey: "to" }],
      [{ accountIndex: 1, mint: MINT, uiTokenAmount: { decimals: 6 } }],
    );
    const transfer = (amount: string, source = "from") => ({
      program: "spl-token",
      programId: TOKEN_PROGRAM,
      parsed: { type: "transfer", info: { source, destination: "other", amount } },
    });
    const [known, small, whole, unknown] = collectTransfers(
      [transfer("1500000"), transfer("5"), transfer("1000000"), transfer("7", "nobody")],
      tokens,
    );
    check("plain transfer uses the token's decimals", known.amount === "1.5", known.amount);
    check("plain transfer finds the mint", known.mint === MINT, known.mint);
    check("small amounts keep leading zeros", small.amount === "0.000005", small.amount);
    check("whole amounts have no decimal point", whole.amount === "1", whole.amount);
    check("unknown tokens stay raw, with no decimals", unknown.amount === "7" && unknown.decimals === undefined);
  }

  console.log("\n[Solana cluster picks the RPC]");
  try {
    const genesis = async (url: string) => {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] }),
      });
      return ((await r.json()) as { result: string }).result;
    };
    const GENESIS: Record<string, string> = {
      "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
      devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
      testnet: "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY",
    };
    for (const [cluster, hash] of Object.entries(GENESIS)) {
      const url = solanaRpcFor(cluster);
      check(`${cluster} default RPC serves ${cluster}`, (await genesis(url)) === hash, url);
    }
    check("your own RPC wins", solanaRpcFor("devnet", "https://my.rpc") === "https://my.rpc");
  } catch (e) {
    console.log(`  (skipped: ${(e as Error).message})`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}
main();
