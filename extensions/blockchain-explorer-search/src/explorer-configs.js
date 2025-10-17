"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explorerConfigs = void 0;
exports.getExplorerConfig = getExplorerConfig;
exports.hasCustomConfig = hasCustomConfig;
/**
 * Special configurations for blockchain explorers that don't follow standard patterns
 * These configurations override the default behavior for specific chains
 */
exports.explorerConfigs = {
    // Solana - uses different paths and base58 encoding
    "solscan.io": {
        paths: {
            transaction: "/tx/",
            address: "/account/",
            block: "/block/",
            token: "/token/",
            signature: "/tx/", // Solana uses signatures instead of tx hashes
        },
        patterns: {
            // Solana addresses/signatures are base58 encoded, typically 32-88 characters
            signature: {
                regex: "^[1-9A-HJ-NP-Za-km-z]{87,88}$",
            },
            address: {
                regex: "^[1-9A-HJ-NP-Za-km-z]{32,44}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "explorer.solana.com": {
        paths: {
            transaction: "/tx/",
            address: "/address/",
            block: "/block/",
            signature: "/tx/",
        },
        patterns: {
            signature: {
                regex: "^[1-9A-HJ-NP-Za-km-z]{87,88}$",
            },
            address: {
                regex: "^[1-9A-HJ-NP-Za-km-z]{32,44}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Bitcoin - uses different address formats
    "blockchair.com": {
        paths: {
            transaction: "/bitcoin/transaction/",
            address: "/bitcoin/address/",
            block: "/bitcoin/block/",
        },
        patterns: {
            transaction: {
                regex: "^[a-fA-F0-9]{64}$",
            },
            // Bitcoin addresses: Legacy (1...), SegWit (3...), Bech32 (bc1...)
            address: {
                regex: "^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "blockchain.com": {
        paths: {
            transaction: "/btc/tx/",
            address: "/btc/address/",
            block: "/btc/block/",
        },
        patterns: {
            transaction: {
                regex: "^[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$",
            },
            block: {
                regex: "^(\\d+|[a-fA-F0-9]{64})$",
            },
        },
    },
    // Cardano - uses Bech32 encoding
    "cardanoscan.io": {
        paths: {
            transaction: "/transaction/",
            address: "/address/",
            block: "/block/",
            token: "/token/",
        },
        patterns: {
            transaction: {
                regex: "^[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^(addr1|stake1)[a-z0-9]{53,}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Sui - uses different format
    "suiscan.xyz": {
        paths: {
            transaction: "/tx/",
            address: "/account/",
            block: "/checkpoint/",
            token: "/object/",
        },
        patterns: {
            transaction: {
                regex: "^[a-zA-Z0-9]{43,44}$",
            },
            address: {
                regex: "^0x[a-fA-F0-9]{64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "suiexplorer.com": {
        paths: {
            transaction: "/txblock/",
            address: "/address/",
            block: "/checkpoint/",
            token: "/object/",
        },
        patterns: {
            transaction: {
                regex: "^[a-zA-Z0-9]{43,44}$",
            },
            address: {
                regex: "^0x[a-fA-F0-9]{64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Aptos
    "aptoscan.com": {
        paths: {
            transaction: "/transaction/",
            address: "/account/",
            block: "/block/",
            token: "/coin/",
        },
        patterns: {
            transaction: {
                regex: "^0x[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^0x[a-fA-F0-9]{1,64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "explorer.aptoslabs.com": {
        paths: {
            transaction: "/txn/",
            address: "/account/",
            block: "/block/",
        },
        patterns: {
            transaction: {
                regex: "^0x[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^0x[a-fA-F0-9]{1,64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Tron
    "tronscan.org": {
        paths: {
            transaction: "/#/transaction/",
            address: "/#/address/",
            block: "/#/block/",
            token: "/#/token20/",
        },
        patterns: {
            transaction: {
                regex: "^[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^T[a-zA-Z0-9]{33}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Cosmos Hub
    "mintscan.io": {
        paths: {
            transaction: "/cosmos/tx/",
            address: "/cosmos/address/",
            block: "/cosmos/block/",
        },
        patterns: {
            transaction: {
                regex: "^[A-F0-9]{64}$",
            },
            address: {
                regex: "^cosmos1[a-z0-9]{38}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Near Protocol
    "nearblocks.io": {
        paths: {
            transaction: "/txns/",
            address: "/address/",
            block: "/blocks/",
        },
        patterns: {
            transaction: {
                regex: "^[a-zA-Z0-9]{43,44}$",
            },
            address: {
                regex: "^[a-z0-9._-]+\\.near$|^[a-fA-F0-9]{64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "explorer.near.org": {
        paths: {
            transaction: "/transactions/",
            address: "/accounts/",
            block: "/blocks/",
        },
        patterns: {
            transaction: {
                regex: "^[a-zA-Z0-9]{43,44}$",
            },
            address: {
                regex: "^[a-z0-9._-]+\\.near$|^[a-fA-F0-9]{64}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Algorand
    "algoexplorer.io": {
        paths: {
            transaction: "/tx/",
            address: "/address/",
            block: "/block/",
        },
        patterns: {
            transaction: {
                regex: "^[A-Z2-7]{52}$",
            },
            address: {
                regex: "^[A-Z2-7]{58}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // Stellar
    "stellarchain.io": {
        paths: {
            transaction: "/tx/",
            address: "/address/",
        },
        patterns: {
            transaction: {
                regex: "^[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^G[A-Z2-7]{55}$",
            },
        },
    },
    // Polkadot
    "polkadot.subscan.io": {
        paths: {
            transaction: "/extrinsic/",
            address: "/account/",
            block: "/block/",
        },
        patterns: {
            transaction: {
                regex: "^0x[a-fA-F0-9]{64}$",
            },
            address: {
                regex: "^1[a-zA-Z0-9]{47}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    // XRP
    "xrpscan.com": {
        paths: {
            transaction: "/tx/",
            address: "/account/",
            block: "/ledger/",
        },
        patterns: {
            transaction: {
                regex: "^[A-F0-9]{64}$",
            },
            address: {
                regex: "^r[1-9A-HJ-NP-Za-km-z]{24,34}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
    "livenet.xrpl.org": {
        paths: {
            transaction: "/transactions/",
            address: "/accounts/",
            block: "/ledgers/",
        },
        patterns: {
            transaction: {
                regex: "^[A-F0-9]{64}$",
            },
            address: {
                regex: "^r[1-9A-HJ-NP-Za-km-z]{24,34}$",
            },
            block: {
                regex: "^\\d+$",
            },
        },
    },
};
/**
 * Get explorer configuration by base URL
 */
function getExplorerConfig(baseUrl) {
    // Try exact match first
    if (exports.explorerConfigs[baseUrl]) {
        return exports.explorerConfigs[baseUrl];
    }
    // Try to find by domain (ignore subdomain differences)
    const domain = baseUrl.replace(/^(www\.|https?:\/\/)/, "");
    for (const [key, config] of Object.entries(exports.explorerConfigs)) {
        if (key.includes(domain) || domain.includes(key)) {
            return config;
        }
    }
    return undefined;
}
/**
 * Check if a baseUrl has custom configuration
 */
function hasCustomConfig(baseUrl) {
    return getExplorerConfig(baseUrl) !== undefined;
}
