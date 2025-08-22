export type Slip44Entry = {
  /** Coin type as per SLIP-0044, e.g., 0 for Bitcoin */
  coinType: number;
  /** Canonical network name (lowercase where applicable) */
  name: string;
  /** Common symbol or alias, if any (e.g., BTC, ETH) */
  symbol?: string;
  /** Additional aliases for search */
  aliases?: string[];
  /** Token standards supported by this network */
  tokenStandards?: string[];
  /** Network type (mainnet, testnet, etc.) */
  networkType?: string;
  /** Decimal places for the native token (e.g., 18 for ETH, 8 for BTC) */
  decimals?: number;
  /** Hexadecimal representation of the coin type */
  hex?: string;
  /** String index from SLIP-0044 */
  index?: string;
};

// Import the complete SLIP-0044 JSON data
import slip44Data from "./slip44-complete.json";

// Transform JSON data to Slip44Entry format
function transformJsonToSlip44Entries(
  jsonData: Record<string, unknown>
): Slip44Entry[] {
  return Object.entries(jsonData).map(([key, entry]) => {
    const typedEntry = entry as {
      index?: string;
      name?: string;
      symbol?: string;
      aliases?: string[];
      tokenStandards?: string[];
      networkType?: string;
      decimals?: number;
      hex?: string;
    };
    return {
      coinType: parseInt(typedEntry.index || key),
      name: (typedEntry.name || "").toLowerCase(),
      symbol: typedEntry.symbol || undefined,
      aliases: typedEntry.aliases || [],
      tokenStandards: typedEntry.tokenStandards || [],
      networkType: typedEntry.networkType || "mainnet",
      decimals: typedEntry.decimals || undefined,
      hex: typedEntry.hex,
      index: typedEntry.index,
    };
  });
}

// Load complete SLIP-0044 data from JSON
export const COMPLETE_SLIP44: Slip44Entry[] =
  transformJsonToSlip44Entries(slip44Data);

// Enhanced fallback list for when JSON loading fails
export const FALLBACK_SLIP44: Slip44Entry[] = [
  {
    coinType: 0,
    name: "bitcoin",
    symbol: "BTC",
    aliases: [
      "btc",
      "bitcoin mainnet",
      "bitcoin mainnet",
      "bitcoin network",
      "bitcoin blockchain",
      "bitcoin protocol",
    ],
    tokenStandards: ["BEP-20", "BRC-20"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 1,
    name: "testnet",
    aliases: ["bitcoin testnet", "btc testnet", "bitcoin test", "test network"],
    tokenStandards: ["BEP-20", "BRC-20"],
    networkType: "testnet",
    decimals: 8,
  },
  {
    coinType: 2,
    name: "namecoin",
    symbol: "NMC",
    aliases: ["nmc", "name coin", "namecoin network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 3,
    name: "litecoin",
    symbol: "LTC",
    aliases: ["ltc", "lite coin", "litecoin network", "litecoin blockchain"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 60,
    name: "ethereum",
    symbol: "ETH",
    aliases: [
      "eth",
      "ethereum mainnet",
      "ethereum network",
      "ethereum blockchain",
      "ethereum protocol",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 61,
    name: "ethereum-classic",
    symbol: "ETC",
    aliases: [
      "etc",
      "ethereum classic",
      "ethereum classic network",
      "etc network",
      "classic",
    ],
    tokenStandards: ["ETC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 195,
    name: "tron",
    symbol: "TRX",
    aliases: [
      "trx",
      "tron mainnet",
      "tron network",
      "tron blockchain",
      "tron protocol",
      "tronix",
    ],
    tokenStandards: ["TRC-20", "TRC-721", "TRC-10"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 354,
    name: "polygon",
    symbol: "MATIC",
    aliases: [
      "matic",
      "polygon pos",
      "polygon mainnet",
      "polygon network",
      "polygon blockchain",
      "matic network",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 501,
    name: "solana",
    symbol: "SOL",
    aliases: [
      "sol",
      "solana mainnet",
      "solana network",
      "solana blockchain",
      "solana protocol",
    ],
    tokenStandards: ["SPL Token", "SPL NFT"],
    networkType: "mainnet",
    decimals: 9,
  },
  {
    coinType: 118,
    name: "cosmos",
    symbol: "ATOM",
    aliases: [
      "atom",
      "cosmos hub",
      "cosmos network",
      "cosmos blockchain",
      "cosmos protocol",
    ],
    tokenStandards: ["CW-20", "CW-721"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 1729,
    name: "tezos",
    symbol: "XTZ",
    aliases: [
      "xtz",
      "tezos mainnet",
      "tezos network",
      "tezos blockchain",
      "tezos protocol",
    ],
    tokenStandards: ["FA-1.2", "FA-2"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 137,
    name: "polygon-testnet",
    aliases: ["matic testnet", "polygon testnet", "polygon test", "matic test"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 5,
    name: "goerli",
    aliases: [
      "goerli testnet",
      "ethereum goerli",
      "goerli",
      "goerli network",
      "ethereum testnet",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 11155111,
    name: "sepolia",
    aliases: [
      "sepolia testnet",
      "ethereum sepolia",
      "sepolia",
      "sepolia network",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 80001,
    name: "mumbai",
    aliases: ["mumbai testnet", "polygon mumbai", "mumbai", "mumbai network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 56,
    name: "binance-smart-chain",
    symbol: "BNB",
    aliases: [
      "bsc",
      "binance smart chain",
      "bnb smart chain",
      "binance chain",
      "bsc network",
      "binance blockchain",
      "bnb chain",
    ],
    tokenStandards: ["BEP-20", "BEP-721"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 97,
    name: "binance-smart-chain-testnet",
    aliases: [
      "bsc testnet",
      "binance smart chain testnet",
      "bsc test",
      "binance testnet",
    ],
    tokenStandards: ["BEP-20", "BEP-721"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 250,
    name: "fantom",
    symbol: "FTM",
    aliases: [
      "ftm",
      "fantom opera",
      "fantom network",
      "fantom blockchain",
      "fantom protocol",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 4002,
    name: "fantom-testnet",
    aliases: ["ftm testnet", "fantom testnet", "fantom test"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 43114,
    name: "avalanche",
    symbol: "AVAX",
    aliases: [
      "avax",
      "avalanche c-chain",
      "avalanche network",
      "avalanche blockchain",
      "avalanche protocol",
      "avax network",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 43113,
    name: "avalanche-testnet",
    aliases: [
      "avax testnet",
      "avalanche testnet",
      "avalanche test",
      "avax test",
    ],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  // Additional popular cryptocurrencies not in SLIP-0044
  {
    coinType: 194,
    name: "eos",
    symbol: "EOS",
    aliases: ["eos mainnet", "eos network", "eos blockchain", "eos protocol"],
    tokenStandards: ["EOS Token", "EOS NFT"],
    networkType: "mainnet",
    decimals: 4,
  },
  {
    coinType: 194001,
    name: "eos-testnet",
    aliases: ["eos testnet", "eos test", "eos test network"],
    tokenStandards: ["EOS Token", "EOS NFT"],
    networkType: "testnet",
    decimals: 4,
  },
  {
    coinType: 194002,
    name: "sonic",
    symbol: "SONIC",
    aliases: [
      "sonic mainnet",
      "sonic network",
      "sonic blockchain",
      "sonic protocol",
    ],
    tokenStandards: ["SONIC Token"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194003,
    name: "sonic-testnet",
    aliases: ["sonic testnet", "sonic test", "sonic test network"],
    tokenStandards: ["SONIC Token"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194004,
    name: "cardano",
    symbol: "ADA",
    aliases: [
      "ada",
      "cardano mainnet",
      "cardano network",
      "cardano blockchain",
      "cardano protocol",
    ],
    tokenStandards: ["Cardano Native Token"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194005,
    name: "cardano-testnet",
    aliases: ["ada testnet", "cardano testnet", "cardano test", "ada test"],
    tokenStandards: ["Cardano Native Token"],
    networkType: "testnet",
    decimals: 6,
  },
  {
    coinType: 194006,
    name: "ripple",
    symbol: "XRP",
    aliases: [
      "xrp",
      "ripple mainnet",
      "ripple network",
      "ripple blockchain",
      "ripple protocol",
    ],
    tokenStandards: ["XRP Ledger Token"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194007,
    name: "ripple-testnet",
    aliases: ["xrp testnet", "ripple testnet", "ripple test", "xrp test"],
    tokenStandards: ["XRP Ledger Token"],
    networkType: "testnet",
    decimals: 6,
  },
  {
    coinType: 194008,
    name: "stellar",
    symbol: "XLM",
    aliases: [
      "xlm",
      "stellar mainnet",
      "stellar network",
      "stellar blockchain",
      "stellar protocol",
    ],
    tokenStandards: ["Stellar Token"],
    networkType: "mainnet",
    decimals: 7,
  },
  {
    coinType: 194009,
    name: "stellar-testnet",
    aliases: ["xlm testnet", "stellar testnet", "stellar test", "xlm test"],
    tokenStandards: ["Stellar Token"],
    networkType: "testnet",
    decimals: 7,
  },
  {
    coinType: 194010,
    name: "polkadot",
    symbol: "DOT",
    aliases: [
      "dot",
      "polkadot mainnet",
      "polkadot network",
      "polkadot blockchain",
      "polkadot protocol",
    ],
    tokenStandards: ["Polkadot Token"],
    networkType: "mainnet",
    decimals: 10,
  },
  {
    coinType: 194011,
    name: "polkadot-testnet",
    aliases: ["dot testnet", "polkadot testnet", "polkadot test", "dot test"],
    tokenStandards: ["Polkadot Token"],
    networkType: "testnet",
    decimals: 10,
  },
  {
    coinType: 194012,
    name: "chainlink",
    symbol: "LINK",
    aliases: [
      "link",
      "chainlink mainnet",
      "chainlink network",
      "chainlink blockchain",
    ],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194013,
    name: "uniswap",
    symbol: "UNI",
    aliases: [
      "uni",
      "uniswap mainnet",
      "uniswap network",
      "uniswap blockchain",
    ],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194014,
    name: "aave",
    symbol: "AAVE",
    aliases: ["aave mainnet", "aave network", "aave blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194015,
    name: "compound",
    symbol: "COMP",
    aliases: [
      "comp",
      "compound mainnet",
      "compound network",
      "compound blockchain",
    ],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194016,
    name: "sushi",
    symbol: "SUSHI",
    aliases: ["sushi mainnet", "sushi network", "sushi blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194017,
    name: "yearn-finance",
    symbol: "YFI",
    aliases: ["yfi", "yearn finance", "yearn mainnet", "yearn network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194018,
    name: "curve",
    symbol: "CRV",
    aliases: ["crv", "curve mainnet", "curve network", "curve blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194019,
    name: "balancer",
    symbol: "BAL",
    aliases: [
      "bal",
      "balancer mainnet",
      "balancer network",
      "balancer blockchain",
    ],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194020,
    name: "synthetix",
    symbol: "SNX",
    aliases: [
      "snx",
      "synthetix mainnet",
      "synthetix network",
      "synthetix blockchain",
    ],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194021,
    name: "maker",
    symbol: "MKR",
    aliases: ["mkr", "maker mainnet", "maker network", "maker blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194022,
    name: "dai",
    symbol: "DAI",
    aliases: ["dai mainnet", "dai network", "dai blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194023,
    name: "usdc",
    symbol: "USDC",
    aliases: ["usdc mainnet", "usdc network", "usdc blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194024,
    name: "usdt",
    symbol: "USDT",
    aliases: ["usdt mainnet", "usdt network", "usdt blockchain"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194025,
    name: "wrapped-bitcoin",
    symbol: "WBTC",
    aliases: ["wbtc", "wrapped bitcoin", "wrapped btc"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194026,
    name: "wrapped-ethereum",
    symbol: "WETH",
    aliases: ["weth", "wrapped eth", "wrapped ethereum"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194027,
    name: "shiba-inu",
    symbol: "SHIB",
    aliases: ["shib", "shiba inu", "shiba"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194028,
    name: "dogecoin",
    symbol: "DOGE",
    aliases: ["doge", "dogecoin mainnet", "dogecoin network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194029,
    name: "monero",
    symbol: "XMR",
    aliases: ["xmr", "monero mainnet", "monero network"],
    networkType: "mainnet",
    decimals: 12,
  },
  {
    coinType: 194030,
    name: "zcash",
    symbol: "ZEC",
    aliases: ["zec", "zcash mainnet", "zcash network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194031,
    name: "dash",
    symbol: "DASH",
    aliases: ["dash mainnet", "dash network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194032,
    name: "neo",
    symbol: "NEO",
    aliases: ["neo mainnet", "neo network"],
    tokenStandards: ["NEP-5"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194033,
    name: "vechain",
    symbol: "VET",
    aliases: ["vet", "vechain mainnet", "vechain network"],
    tokenStandards: ["VIP-180"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194034,
    name: "icon",
    symbol: "ICX",
    aliases: ["icx", "icon mainnet", "icon network"],
    tokenStandards: ["IRC-2"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194035,
    name: "ontology",
    symbol: "ONT",
    aliases: ["ont", "ontology mainnet", "ontology network"],
    tokenStandards: ["OEP-4"],
    networkType: "mainnet",
    decimals: 9,
  },
  {
    coinType: 194036,
    name: "qtum",
    symbol: "QTUM",
    aliases: ["qtum mainnet", "qtum network"],
    tokenStandards: ["QRC-20"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194037,
    name: "waves",
    symbol: "WAVES",
    aliases: ["waves mainnet", "waves network"],
    tokenStandards: ["Waves Token"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194038,
    name: "nano",
    symbol: "NANO",
    aliases: ["nano mainnet", "nano network"],
    networkType: "mainnet",
    decimals: 30,
  },
  {
    coinType: 194039,
    name: "iota",
    symbol: "MIOTA",
    aliases: ["miota", "iota mainnet", "iota network"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194040,
    name: "decred",
    symbol: "DCR",
    aliases: ["dcr", "decred mainnet", "decred network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194041,
    name: "zilliqa",
    symbol: "ZIL",
    aliases: ["zil", "zilliqa mainnet", "zilliqa network"],
    tokenStandards: ["ZRC-2"],
    networkType: "mainnet",
    decimals: 12,
  },
  {
    coinType: 194042,
    name: "algorand",
    symbol: "ALGO",
    aliases: ["algo", "algorand mainnet", "algorand network"],
    tokenStandards: ["Algorand Standard Asset"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194043,
    name: "filecoin",
    symbol: "FIL",
    aliases: ["fil", "filecoin mainnet", "filecoin network"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194044,
    name: "helium",
    symbol: "HNT",
    aliases: ["hnt", "helium mainnet", "helium network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194045,
    name: "theta",
    symbol: "THETA",
    aliases: ["theta mainnet", "theta network"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194046,
    name: "bittorrent",
    symbol: "BTT",
    aliases: ["btt", "bittorrent mainnet", "bittorrent network"],
    tokenStandards: ["TRC-20"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194047,
    name: "chiliz",
    symbol: "CHZ",
    aliases: ["chz", "chiliz mainnet", "chiliz network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194048,
    name: "enjin-coin",
    symbol: "ENJ",
    aliases: ["enj", "enjin coin", "enjin mainnet"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194049,
    name: "decentraland",
    symbol: "MANA",
    aliases: ["mana", "decentraland mainnet", "decentraland network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194050,
    name: "sandbox",
    symbol: "SAND",
    aliases: ["sand", "sandbox mainnet", "sandbox network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194051,
    name: "axie-infinity",
    symbol: "AXS",
    aliases: ["axs", "axie infinity", "axie mainnet"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194052,
    name: "gala",
    symbol: "GALA",
    aliases: ["gala mainnet", "gala network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194053,
    name: "illuvium",
    symbol: "ILV",
    aliases: ["ilv", "illuvium mainnet", "illuvium network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194054,
    name: "stepn",
    symbol: "GMT",
    aliases: ["gmt", "stepn mainnet", "stepn network"],
    tokenStandards: ["ERC-20"],
    networkType: "mainnet",
    decimals: 6,
  },
  {
    coinType: 194055,
    name: "aptos",
    symbol: "APT",
    aliases: ["apt", "aptos mainnet", "aptos network"],
    tokenStandards: ["Aptos Token"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194056,
    name: "sui",
    symbol: "SUI",
    aliases: ["sui mainnet", "sui network"],
    tokenStandards: ["Sui Token"],
    networkType: "mainnet",
    decimals: 9,
  },
  {
    coinType: 194057,
    name: "near",
    symbol: "NEAR",
    aliases: ["near mainnet", "near network"],
    tokenStandards: ["NEAR Token"],
    networkType: "mainnet",
    decimals: 24,
  },
  {
    coinType: 194058,
    name: "flow",
    symbol: "FLOW",
    aliases: ["flow mainnet", "flow network"],
    tokenStandards: ["Flow Token"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194059,
    name: "hedera",
    symbol: "HBAR",
    aliases: ["hbar", "hedera mainnet", "hedera network"],
    tokenStandards: ["Hedera Token"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194060,
    name: "elrond",
    symbol: "EGLD",
    aliases: ["egld", "elrond mainnet", "elrond network"],
    tokenStandards: ["ESDT"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194061,
    name: "kaspa",
    symbol: "KAS",
    aliases: ["kas", "kaspa mainnet", "kaspa network"],
    networkType: "mainnet",
    decimals: 8,
  },
  {
    coinType: 194062,
    name: "kaspa-testnet",
    aliases: ["kas testnet", "kaspa testnet", "kaspa test"],
    networkType: "testnet",
    decimals: 8,
  },
  {
    coinType: 194063,
    name: "ton",
    symbol: "TON",
    aliases: ["ton mainnet", "ton network", "toncoin"],
    tokenStandards: ["TON Token"],
    networkType: "mainnet",
    decimals: 9,
  },
  {
    coinType: 194064,
    name: "ton-testnet",
    aliases: ["ton testnet", "ton test", "ton test network"],
    tokenStandards: ["TON Token"],
    networkType: "testnet",
    decimals: 9,
  },
  {
    coinType: 194065,
    name: "arbitrum",
    symbol: "ARB",
    aliases: ["arb", "arbitrum mainnet", "arbitrum network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194066,
    name: "arbitrum-testnet",
    aliases: ["arb testnet", "arbitrum testnet", "arbitrum test"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194067,
    name: "optimism",
    symbol: "OP",
    aliases: ["op", "optimism mainnet", "optimism network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194068,
    name: "optimism-testnet",
    aliases: ["op testnet", "optimism testnet", "optimism test"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194069,
    name: "base",
    symbol: "BASE",
    aliases: ["base mainnet", "base network", "coinbase base"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194070,
    name: "base-testnet",
    aliases: ["base testnet", "base test", "base test network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194071,
    name: "linea",
    symbol: "LINEA",
    aliases: ["linea mainnet", "linea network", "consensys linea"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194072,
    name: "linea-testnet",
    aliases: ["linea testnet", "linea test", "linea test network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194073,
    name: "scroll",
    symbol: "SCROLL",
    aliases: ["scroll mainnet", "scroll network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194074,
    name: "scroll-testnet",
    aliases: ["scroll testnet", "scroll test", "scroll test network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194075,
    name: "mantle",
    symbol: "MNT",
    aliases: ["mnt", "mantle mainnet", "mantle network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194076,
    name: "mantle-testnet",
    aliases: ["mnt testnet", "mantle testnet", "mantle test"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194077,
    name: "opbnb",
    symbol: "OPBNB",
    aliases: ["opbnb mainnet", "opbnb network", "binance opbnb"],
    tokenStandards: ["BEP-20", "BEP-721"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194078,
    name: "opbnb-testnet",
    aliases: ["opbnb testnet", "opbnb test", "opbnb test network"],
    tokenStandards: ["BEP-20", "BEP-721"],
    networkType: "testnet",
    decimals: 18,
  },
  {
    coinType: 194079,
    name: "manta",
    symbol: "MANTA",
    aliases: ["manta mainnet", "manta network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "mainnet",
    decimals: 18,
  },
  {
    coinType: 194080,
    name: "manta-testnet",
    aliases: ["manta testnet", "manta test", "manta test network"],
    tokenStandards: ["ERC-20", "ERC-721", "ERC-1155"],
    networkType: "testnet",
    decimals: 18,
  },
];

export type Slip44Index = {
  byName: Map<string, Slip44Entry>;
  byCoinType: Map<number, Slip44Entry>;
};

export function buildIndex(entries: Slip44Entry[]): Slip44Index {
  const byName = new Map<string, Slip44Entry>();
  const byCoinType = new Map<number, Slip44Entry>();
  for (const e of entries) {
    byCoinType.set(e.coinType, e);
    const names = new Set<string>();
    names.add(e.name.toLowerCase());
    if (e.symbol) names.add(e.symbol.toLowerCase());
    if (e.aliases) for (const a of e.aliases) names.add(a.toLowerCase());
    for (const n of names) byName.set(n, e);
  }
  return { byName, byCoinType };
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchEntries(
  entries: Slip44Entry[],
  query: string,
  showTestnets: boolean = true
): Slip44Entry[] {
  // Filter testnets based on preference
  const filteredEntries = showTestnets
    ? entries
    : entries.filter((e) => e.networkType !== "testnet");

  const q = normalizeQuery(query);

  if (!q) {
    // Sort by mainnet first, then by coin type
    return filteredEntries
      .sort((a, b) => {
        if (a.networkType === "mainnet" && b.networkType !== "mainnet")
          return -1;
        if (a.networkType !== "mainnet" && b.networkType === "mainnet")
          return 1;
        return a.coinType - b.coinType;
      })
      .slice(0, 50);
  }

  const isNumber = /^\d+$/.test(q);
  if (isNumber) {
    const id = Number(q);
    const matches = filteredEntries.filter((e) => e.coinType === id);
    return matches.sort((a, b) => {
      if (a.networkType === "mainnet" && b.networkType !== "mainnet") return -1;
      if (a.networkType !== "mainnet" && b.networkType === "mainnet") return 1;
      return a.coinType - b.coinType;
    });
  }

  // Simple network name search first
  const exactMatches = filteredEntries.filter(
    (e) =>
      e.name.toLowerCase() === q ||
      (e.symbol && e.symbol.toLowerCase() === q) ||
      e.aliases?.some((alias) => alias.toLowerCase() === q)
  );

  if (exactMatches.length > 0) {
    return exactMatches.sort((a, b) => {
      if (a.networkType === "mainnet" && b.networkType !== "mainnet") return -1;
      if (a.networkType !== "mainnet" && b.networkType === "mainnet") return 1;
      return a.coinType - b.coinType;
    });
  }

  // Partial matches
  const partialMatches = filteredEntries.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.symbol && e.symbol.toLowerCase().includes(q)) ||
      e.aliases?.some((alias) => alias.toLowerCase().includes(q))
  );

  if (partialMatches.length > 0) {
    return partialMatches
      .sort((a, b) => {
        if (a.networkType === "mainnet" && b.networkType !== "mainnet")
          return -1;
        if (a.networkType !== "mainnet" && b.networkType === "mainnet")
          return 1;
        return a.coinType - b.coinType;
      })
      .slice(0, 50);
  }

  // Token standard search
  if (
    q.includes("erc") ||
    q.includes("trc") ||
    q.includes("bep") ||
    q.includes("spl") ||
    q.includes("cw") ||
    q.includes("fa")
  ) {
    // Remove dashes for token standard comparison
    const standard = q.toLowerCase().replace(/-/g, "");
    return filteredEntries
      .filter((e) =>
        e.tokenStandards?.some((ts) =>
          ts.toLowerCase().replace(/-/g, "").includes(standard)
        )
      )
      .sort((a, b) => {
        if (a.networkType === "mainnet" && b.networkType !== "mainnet")
          return -1;
        if (a.networkType !== "mainnet" && b.networkType === "mainnet")
          return 1;
        return a.coinType - b.coinType;
      })
      .slice(0, 50);
  }

  // General word-based search as fallback
  const words = q.split(/\s+|[-_]/).filter(Boolean);
  return filteredEntries
    .map((e) => ({
      e,
      score: scoreName(e, words),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      // First sort by mainnet priority
      if (a.e.networkType === "mainnet" && b.e.networkType !== "mainnet")
        return -1;
      if (a.e.networkType !== "mainnet" && b.e.networkType === "mainnet")
        return 1;
      // Then by score
      return b.score - a.score;
    })
    .slice(0, 50)
    .map((x) => x.e);
}

function scoreName(entry: Slip44Entry, words: string[]): number {
  const haystack = [
    entry.name,
    entry.symbol ?? "",
    ...(entry.aliases ?? []),
    ...(entry.tokenStandards ?? []),
    entry.networkType ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const w of words) {
    if (!w) continue;

    // Exact matches get highest priority
    if (entry.name.toLowerCase() === w) score += 20;
    if (entry.symbol && entry.symbol.toLowerCase() === w) score += 15;

    // Partial matches in names
    if (entry.name.toLowerCase().includes(w)) score += 8;
    if (entry.symbol && entry.symbol.toLowerCase().includes(w)) score += 6;

    // Alias matches
    if (entry.aliases?.some((alias) => alias.toLowerCase() === w)) score += 12;
    if (entry.aliases?.some((alias) => alias.toLowerCase().includes(w)))
      score += 5;

    // General haystack matching
    if (haystack === w) score += 10;
    if (haystack.includes(w)) score += 3;

    // Bonus for token standard matches
    if (
      entry.tokenStandards?.some((ts) =>
        ts.toLowerCase().replace(/-/g, "").includes(w.replace(/-/g, ""))
      )
    )
      score += 4;

    // Bonus for network type matches
    if (entry.networkType && entry.networkType.toLowerCase().includes(w))
      score += 2;
  }
  return score;
}

// Utility functions for decimal conversion
export function toDecimalString(amount: string, decimals: number): string {
  console.log(
    `toDecimalString called with: amount="${amount}", decimals=${decimals}`
  );

  try {
    // Simple string-based conversion to avoid any floating point issues
    const parts = amount.split(".");
    let integerPart = parts[0] || "0";
    let decimalPart = parts[1] || "";

    console.log(
      `Split parts: integer="${integerPart}", decimal="${decimalPart}"`
    );

    // Handle negative numbers
    let isNegative = false;
    if (integerPart.startsWith("-")) {
      isNegative = true;
      integerPart = integerPart.substring(1);
    }

    // Remove leading zeros from integer part (but keep at least one digit)
    while (integerPart.length > 1 && integerPart[0] === "0") {
      integerPart = integerPart.substring(1);
    }

    // Pad decimal part with zeros to reach the required decimal places
    while (decimalPart.length < decimals) {
      decimalPart += "0";
    }

    console.log(
      `After padding: integer="${integerPart}", decimal="${decimalPart}"`
    );

    // Truncate decimal part if it's too long
    if (decimalPart.length > decimals) {
      decimalPart = decimalPart.substring(0, decimals);
    }

    // Combine parts
    let result = integerPart + decimalPart;

    // Remove leading zeros from the final result (but keep at least one digit)
    while (result.length > 1 && result[0] === "0") {
      result = result.substring(1);
    }

    // Add negative sign if needed
    if (isNegative) {
      result = "-" + result;
    }

    // If result is empty or just zeros, return "0"
    if (result === "" || /^0+$/.test(result) || result === "-0") {
      return "0";
    }

    // Add number separators (commas) for better readability
    const formattedResult = addNumberSeparators(result);

    console.log(`Final result: "${formattedResult}"`);
    return formattedResult;
  } catch (error) {
    console.error("toDecimalString error:", error);
    return "Conversion error";
  }
}

// Keep the old function name for backward compatibility but make it use the new implementation
export function toDecimal(amount: string, decimals: number): string {
  return toDecimalString(amount, decimals);
}

// Helper function to add number separators (commas)
function addNumberSeparators(num: string): string {
  // Handle negative numbers
  let isNegative = false;
  let cleanNum = num;
  if (num.startsWith("-")) {
    isNegative = true;
    cleanNum = num.substring(1);
  }

  // Add commas every 3 digits from the right
  let result = "";
  for (let i = 0; i < cleanNum.length; i++) {
    if (i > 0 && (cleanNum.length - i) % 3 === 0) {
      result += ",";
    }
    result += cleanNum[i];
  }

  // Add negative sign back if needed
  if (isNegative) {
    result = "-" + result;
  }

  return result;
}

export function fromDecimal(decimalAmount: string, decimals: number): string {
  try {
    // Use string manipulation to avoid floating point issues
    const num = decimalAmount;

    // If the decimal amount is shorter than the required decimals, add leading zeros
    if (num.length < decimals) {
      const paddedNum = "0".repeat(decimals - num.length) + num;
      return "0." + paddedNum;
    }

    // Insert decimal point at the correct position
    const integerPart = num.substring(0, num.length - decimals);
    const decimalPart = num.substring(num.length - decimals);

    // Handle case where integer part is empty (very small number)
    if (integerPart === "" || /^0+$/.test(integerPart)) {
      return "0." + decimalPart;
    }

    // Remove leading zeros from integer part
    let cleanInteger = integerPart;
    while (cleanInteger.length > 1 && cleanInteger[0] === "0") {
      cleanInteger = cleanInteger.substring(1);
    }

    // Remove trailing zeros from decimal part
    let cleanDecimal = decimalPart;
    while (
      cleanDecimal.length > 1 &&
      cleanDecimal[cleanDecimal.length - 1] === "0"
    ) {
      cleanDecimal = cleanDecimal.substring(0, cleanDecimal.length - 1);
    }

    // If decimal part is empty after cleaning, return just the integer
    if (cleanDecimal === "" || /^0+$/.test(cleanDecimal)) {
      return cleanInteger;
    }

    return cleanInteger + "." + cleanDecimal;
  } catch (error) {
    return "Conversion error";
  }
}

export function formatDecimal(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return "Invalid amount";

    const result = num * Math.pow(10, decimals);
    return result.toLocaleString("fullwide", { useGrouping: false });
  } catch {
    return "Format error";
  }
}

// Runtime cache for complete entries
let cachedEntries: Slip44Entry[] | null = null;

export async function getSlip44Entries(): Promise<Slip44Entry[]> {
  // Return cached entries if available
  if (cachedEntries) {
    console.log("Returning cached entries:", cachedEntries.length);
    return cachedEntries;
  }

  try {
    // Use the complete SLIP-0044 data loaded from JSON
    console.log("Loading complete SLIP-0044 data from JSON...");
    cachedEntries = [...COMPLETE_SLIP44];
    console.log("Successfully loaded entries:", cachedEntries.length);

    // Verify KNC is included
    const kncEntry = cachedEntries.find(
      (e) => e.symbol === "KNC" || e.name.includes("kyber")
    );
    if (kncEntry) {
      console.log("✅ KNC entry found:", kncEntry);
    } else {
      console.log("❌ KNC entry not found");
    }

    return cachedEntries;
  } catch (error) {
    console.error("Error loading complete SLIP-0044 data:", error);
    console.log("Falling back to hardcoded fallback data");

    // Use fallback data if complete data loading fails
    cachedEntries = [...FALLBACK_SLIP44];
    return cachedEntries;
  }
}
