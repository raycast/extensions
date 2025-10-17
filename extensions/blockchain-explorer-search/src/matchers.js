"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockMatch = exports.ENSMatch = exports.TokenMatch = exports.AddressMatch = exports.SignatureMatch = exports.TransactionMatch = exports.Match = void 0;
const explorer_configs_1 = require("./explorer-configs");
class Match {
    constructor(search, explorer, matchType) {
        this.search = search;
        this.explorer = explorer;
        this.matchType = matchType;
    }
    /**
     * Get the configured path for this match type
     */
    getPathPrefix() {
        const config = (0, explorer_configs_1.getExplorerConfig)(this.explorer.baseUrl) || this.explorer.config;
        if (config?.paths?.[this.matchType]) {
            return config.paths[this.matchType];
        }
        // Default paths for EVM-compatible chains
        const defaultPaths = {
            transaction: "/tx/",
            address: "/address/",
            block: "/block/",
            token: "/token/",
            ens: "/enslookup-search?search=",
            signature: "/tx/",
        };
        return defaultPaths[this.matchType] || "/";
    }
    /**
     * Get the pattern configuration for this match type
     */
    getPattern() {
        const config = (0, explorer_configs_1.getExplorerConfig)(this.explorer.baseUrl) || this.explorer.config;
        if (config?.patterns?.[this.matchType]) {
            return config.patterns[this.matchType];
        }
        return undefined;
    }
    /**
     * Test if search matches the configured pattern
     */
    matchesPattern(pattern) {
        const regex = new RegExp(pattern.regex);
        return regex.test(this.search);
    }
}
exports.Match = Match;
// A transaction hash is either 64 (without 0x prefix) or 66 characters for EVM chains
class TransactionMatch extends Match {
    constructor(search, explorer) {
        super(search, explorer, "transaction");
    }
    get title() {
        return `Transaction ${this.search}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    get parsedSearch() {
        const customPattern = this.getPattern();
        if (customPattern?.normalize) {
            return customPattern.normalize(this.search);
        }
        // Default EVM normalization: add 0x prefix if needed
        if (this.search.length === 64 && !this.search.startsWith("0x")) {
            return "0x" + this.search;
        }
        return this.search;
    }
    match() {
        const customPattern = this.getPattern();
        // Use custom pattern if available
        if (customPattern) {
            return this.matchesPattern(customPattern);
        }
        // Default EVM transaction hash matching
        // Must be hexadecimal
        if (!/^0?x?[0-9A-Fa-f]+$/.test(this.search))
            return false;
        if (this.search.length === 64 && !this.search.startsWith("0x"))
            return true;
        if (this.search.length === 66 && this.search.startsWith("0x"))
            return true;
        return false;
    }
}
exports.TransactionMatch = TransactionMatch;
// A signature match (primarily for Solana and similar chains)
class SignatureMatch extends Match {
    constructor(search, explorer) {
        super(search, explorer, "signature");
    }
    get title() {
        return `Signature ${this.search}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    get parsedSearch() {
        const customPattern = this.getPattern();
        if (customPattern?.normalize) {
            return customPattern.normalize(this.search);
        }
        return this.search;
    }
    match() {
        const customPattern = this.getPattern();
        // Use custom pattern if available
        if (customPattern) {
            return this.matchesPattern(customPattern);
        }
        // Default: no signature matching unless custom pattern is defined
        return false;
    }
}
exports.SignatureMatch = SignatureMatch;
// An address is either 40 (without 0x prefix) or 42 characters for EVM chains
class AddressMatch extends Match {
    constructor(search, explorer) {
        super(search, explorer, "address");
    }
    get title() {
        return `Address ${this.search}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    get parsedSearch() {
        const customPattern = this.getPattern();
        if (customPattern?.normalize) {
            return customPattern.normalize(this.search);
        }
        // Default EVM normalization: add 0x prefix if needed
        if (this.search.length === 40 && !this.search.startsWith("0x")) {
            return "0x" + this.search;
        }
        return this.search;
    }
    match() {
        const customPattern = this.getPattern();
        // Use custom pattern if available
        if (customPattern) {
            return this.matchesPattern(customPattern);
        }
        // Default EVM address matching
        // Must be hexadecimal
        if (!/^0?x?[0-9A-Fa-f]+$/.test(this.search))
            return false;
        // If there isn't a 0x prefix, add it in the parsedSearch
        if (this.search.length === 40 && !this.search.startsWith("0x"))
            return true;
        if (this.search.length === 42 && this.search.startsWith("0x"))
            return true;
        return false;
    }
}
exports.AddressMatch = AddressMatch;
// A Token is an address that matches the token list
class TokenMatch extends AddressMatch {
    constructor(search, explorer, tokenLists) {
        super(search, explorer);
        this.matchType = "token";
        if (tokenLists) {
            this.tokenList = tokenLists[explorer.chainId];
        }
    }
    get title() {
        if (this.token) {
            const { name, symbol, decimals } = this.token;
            return `${name} token (${symbol}) - ${decimals} decimals ${this.parsedSearch}.`;
        }
        return `Token ${this.parsedSearch}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    match() {
        if (!super.match())
            return false;
        if (this.tokenList) {
            const foundToken = this.tokenList.find(({ address }) => address.toLowerCase() === this.search.toLowerCase());
            if (foundToken) {
                this.token = foundToken;
                return true;
            }
        }
        return false;
    }
}
exports.TokenMatch = TokenMatch;
// .eth at the end
class ENSMatch extends Match {
    constructor(search, explorer) {
        super(search, explorer, "ens");
    }
    get title() {
        return `ENS name ${this.parsedSearch}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    get parsedSearch() {
        return this.search;
    }
    match() {
        const customPattern = this.getPattern();
        // Use custom pattern if available
        if (customPattern) {
            return this.matchesPattern(customPattern);
        }
        // Default ENS matching: only on Ethereum mainnet
        if (this.explorer.chainId !== 1)
            return false;
        if (this.search.endsWith(".eth"))
            return true;
        return false;
    }
}
exports.ENSMatch = ENSMatch;
// A block is numeric
class BlockMatch extends Match {
    constructor(search, explorer) {
        super(search, explorer, "block");
    }
    get title() {
        return `Block height ${this.parsedSearch}`;
    }
    get path() {
        const pathPrefix = this.getPathPrefix();
        return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
    }
    get parsedSearch() {
        const customPattern = this.getPattern();
        if (customPattern?.normalize) {
            return customPattern.normalize(this.search);
        }
        return this.search;
    }
    match() {
        const customPattern = this.getPattern();
        // Use custom pattern if available
        if (customPattern) {
            return this.matchesPattern(customPattern);
        }
        // Default block matching: numeric only
        if (/^\d+$/g.test(this.search))
            return true;
        return false;
    }
}
exports.BlockMatch = BlockMatch;
