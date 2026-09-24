#!/usr/bin/env node
// Live smoke check for the Codex API client. Run by hand:
//
//   CODEX_API_KEY="$(security find-generic-password -s codex-api-key -w 2>/dev/null)" npm run smoke
//
// This script never prints the key itself, only its shape. It duplicates
// the GraphQL query strings from src/lib/codex.ts instead of importing the
// TypeScript source, so it can run under plain Node with no build step.

const CODEX_GRAPHQL_ENDPOINT = "https://graph.codex.io/graphql";

const MAJOR_CHAIN_IDS = [
  1, // Ethereum
  8453, // Base
  56, // BNB Chain
  42161, // Arbitrum
  137, // Polygon
  10, // Optimism
  43114, // Avalanche
  1399811149, // Solana
  101, // Sui
  728126428, // Tron
  81457, // Blast
  59144, // Linea
  534352, // Scroll
  324, // zkSync Era
  999, // HyperEVM
];

const GET_NETWORKS_QUERY = `
  query GetNetworks {
    getNetworks {
      id
      name
      networkShortName
    }
  }
`;

const FILTER_TOKENS_QUERY = `
  query FilterTokens($phrase: String!, $limit: Int, $filters: TokenFilters) {
    filterTokens(
      phrase: $phrase
      filters: $filters
      rankings: [{ attribute: volume24, direction: DESC }]
      limit: $limit
    ) {
      results {
        priceUSD
        change24
        liquidity
        volume24
        marketCap
        token {
          address
          name
          symbol
          networkId
          info {
            imageThumbUrl
            imageSmallUrl
          }
        }
      }
    }
  }
`;

// Kept in sync by hand with src/lib/networks.ts DEFINED_SLUG_OVERRIDES.
const DEFINED_SLUG_OVERRIDES = {
  1: "eth",
  1399811149: "sol",
  8453: "base",
  56: "bsc",
  42161: "arb",
  10: "opti",
  143: "mon",
  4663: "robinhood",
};

function definedSlugFor(networkId, networkShortName, networkName) {
  if (DEFINED_SLUG_OVERRIDES[networkId]) return DEFINED_SLUG_OVERRIDES[networkId];
  const shortName = (networkShortName || "").trim();
  if (shortName) return shortName.toLowerCase();
  return (networkName || String(networkId))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function definedUrl(slug, address) {
  return `https://www.defined.fi/token/${slug}/${address}`;
}

async function codexRequest(apiKey, query, variables) {
  const response = await fetch(CODEX_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok || body?.errors?.length) {
    const message = body?.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Codex API error: ${message}`);
  }
  return body.data;
}

function describeKeyShape(key) {
  const classes = [];
  if (/[a-z]/.test(key)) classes.push("lowercase");
  if (/[A-Z]/.test(key)) classes.push("uppercase");
  if (/[0-9]/.test(key)) classes.push("digits");
  if (/-/.test(key)) classes.push("-");
  if (/_/.test(key)) classes.push("_");
  if (/\./.test(key)) classes.push(".");
  return { length: key.length, classes };
}

async function main() {
  const apiKey = process.env.CODEX_API_KEY;
  if (!apiKey) {
    console.error("CODEX_API_KEY is not set. Skipping smoke run.");
    console.error('Try: CODEX_API_KEY="$(security find-generic-password -s codex-api-key -w 2>/dev/null)" npm run smoke');
    process.exit(1);
  }

  const shape = describeKeyShape(apiKey.trim());
  console.log("== Key shape (never the key itself) ==");
  console.log(`length: ${shape.length}`);
  console.log(`character classes present: ${shape.classes.join(", ") || "(none)"}`);
  console.log();

  console.log("== getNetworks ==");
  const networksData = await codexRequest(apiKey, GET_NETWORKS_QUERY, {});
  const networks = networksData.getNetworks;
  console.log(`total networks: ${networks.length}`);
  const byId = new Map(networks.map((n) => [n.id, n]));
  for (const id of MAJOR_CHAIN_IDS) {
    const n = byId.get(id);
    if (n) {
      console.log(`  id=${n.id}\tname=${n.name}\tshortName=${n.networkShortName ?? "(none)"}`);
    } else {
      console.log(`  id=${id}\t(not found in getNetworks response)`);
    }
  }
  console.log();

  console.log("== searchTokens ==");
  const queries = ["pepe", "$PEPE", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"];
  for (const phrase of queries) {
    console.log(`-- phrase: ${phrase} --`);
    const data = await codexRequest(apiKey, FILTER_TOKENS_QUERY, { phrase, limit: 5 });
    const results = data.filterTokens?.results ?? [];
    if (results.length === 0) {
      console.log("  (no results)");
      continue;
    }
    for (const row of results.slice(0, 5)) {
      const token = row.token;
      const network = byId.get(token.networkId);
      const slug = definedSlugFor(token.networkId, network?.networkShortName, network?.name);
      console.log(
        `  ${token.symbol ?? "?"}\t${token.name ?? "?"}\t${network?.name ?? `network ${token.networkId}`}\t` +
          `price=${row.priceUSD ?? "?"}\tvolume24=${row.volume24 ?? "?"}\tliquidity=${row.liquidity ?? "?"}\t` +
          `${definedUrl(slug, token.address)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("Smoke run failed:", err.message);
  process.exit(1);
});
