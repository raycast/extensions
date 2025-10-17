"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const storage_1 = require("./utils/storage");
const save_address_form_1 = __importDefault(require("./components/save-address-form"));
const blockchain_utils_1 = require("./utils/blockchain-utils");
const chains = __importStar(require("viem/chains"));
const custom_chains_1 = require("./custom-chains");
const createExplorersFromChains = () => {
    const allChains = [...Object.values(chains), ...custom_chains_1.customChains];
    const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());
    return uniqueChains
        .filter((chain) => chain.blockExplorers?.default !== undefined)
        .map((chain) => {
        if (!chain.blockExplorers?.default) {
            throw new Error("Chain should have default explorer");
        }
        const nameWithoutNet = chain.name.replace(/testnet|mainnet/gi, "");
        const explorer = {
            chainName: nameWithoutNet,
            explorerName: chain.blockExplorers.default.name || "Block Explorer",
            baseUrl: chain.blockExplorers.default.url.replace(/^https?:\/\//, ""),
            chainId: chain.id,
            currency: chain.nativeCurrency.symbol,
            iconUri: `../assets/${nameWithoutNet.toLowerCase()}.svg`,
            testNet: chain.testnet || false,
            imageUrl: chain.blockExplorers.default.url + "/images/logo.svg",
        };
        return explorer;
    });
};
const builtInExplorers = createExplorersFromChains();
function Command() {
    const [addresses, setAddresses] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [searchText, setSearchText] = (0, react_1.useState)("");
    const [allExplorers, setAllExplorers] = (0, react_1.useState)(builtInExplorers);
    const { push } = (0, api_1.useNavigation)();
    (0, react_1.useEffect)(() => {
        loadAddresses();
        loadExplorers();
    }, []);
    const loadAddresses = async () => {
        setIsLoading(true);
        const loaded = await (0, storage_1.getSavedAddresses)();
        // Sort by last used, most recent first
        loaded.sort((a, b) => b.lastUsed - a.lastUsed);
        setAddresses(loaded);
        setIsLoading(false);
    };
    const loadExplorers = async () => {
        try {
            const userChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
            const userChains = userChainsJson ? JSON.parse(userChainsJson) : [];
            const combined = [...builtInExplorers, ...userChains];
            setAllExplorers(combined);
        }
        catch (error) {
            console.error("Error loading explorers:", error);
        }
    };
    const handlePasteAddress = async () => {
        try {
            const clipboardText = await api_1.Clipboard.readText();
            if (!clipboardText) {
                (0, api_1.showToast)({ title: "Clipboard Empty", message: "No text found in clipboard" });
                return;
            }
            const trimmed = clipboardText.trim();
            // Basic address validation (0x followed by hex characters)
            const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
            if (!isValidAddress) {
                (0, api_1.showToast)({ title: "Invalid Address", message: "Clipboard doesn't contain a valid address" });
                return;
            }
            // Get default explorer (Ethereum)
            const defaultExplorer = allExplorers.find((e) => e.chainId === 1) || allExplorers[0];
            push((0, jsx_runtime_1.jsx)(save_address_form_1.default, { address: trimmed, chainId: defaultExplorer.chainId, chainName: defaultExplorer.chainName, allExplorers: allExplorers, onSaved: loadAddresses }));
        }
        catch (error) {
            console.error("Error pasting address:", error);
            (0, api_1.showToast)({ title: "Error", message: "Failed to paste address" });
        }
    };
    const handleDelete = async (address) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Delete Saved Address",
            message: `Are you sure you want to delete "${address.label}"?`,
            primaryAction: {
                title: "Delete",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (confirmed) {
            await (0, storage_1.deleteSavedAddress)(address.id);
            await loadAddresses();
            (0, api_1.showToast)({ title: "Deleted", message: `Removed "${address.label}"` });
        }
    };
    const handleOpenExplorer = async (address) => {
        await (0, storage_1.updateAddressLastUsed)(address.address);
        await loadAddresses();
    };
    const handleExport = async (format) => {
        let content = "";
        let message = "";
        switch (format) {
            case "json":
                content = (0, storage_1.exportAsJSON)(addresses);
                message = "Exported as JSON";
                break;
            case "csv":
                content = (0, storage_1.exportAsCSV)(addresses);
                message = "Exported as CSV";
                break;
            case "markdown":
                content = (0, storage_1.exportSavedAddressesAsMarkdown)(addresses);
                message = "Exported as Markdown";
                break;
        }
        await api_1.Clipboard.copy(content);
        (0, api_1.showToast)({ title: "Copied to Clipboard", message });
    };
    const filteredAddresses = addresses.filter((addr) => {
        const search = searchText.toLowerCase();
        return (addr.label.toLowerCase().includes(search) ||
            addr.address.toLowerCase().includes(search) ||
            addr.tags.some((tag) => tag.toLowerCase().includes(search)) ||
            (addr.notes && addr.notes.toLowerCase().includes(search)));
    });
    // Group by tags
    const tagGroups = new Map();
    tagGroups.set("All", filteredAddresses);
    filteredAddresses.forEach((addr) => {
        if (addr.tags.length === 0) {
            if (!tagGroups.has("Untagged")) {
                tagGroups.set("Untagged", []);
            }
            tagGroups.get("Untagged").push(addr);
        }
        else {
            addr.tags.forEach((tag) => {
                if (!tagGroups.has(tag)) {
                    tagGroups.set(tag, []);
                }
                tagGroups.get(tag).push(addr);
            });
        }
    });
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, searchText: searchText, onSearchTextChange: setSearchText, searchBarPlaceholder: "Search saved addresses by label, address, or tag...", navigationTitle: "Saved Addresses", children: filteredAddresses.length === 0 && !isLoading ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No Saved Addresses", description: "Save addresses from search results with \u2318 + S or paste with \u2318 + \u21B5", icon: api_1.Icon.Star, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Paste Address from Clipboard", icon: api_1.Icon.Clipboard, shortcut: { modifiers: ["cmd"], key: "return" }, onAction: handlePasteAddress }) }) })) : ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `${filteredAddresses.length} Address${filteredAddresses.length === 1 ? "" : "es"}`, children: filteredAddresses.map((address) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: address.label, subtitle: (0, blockchain_utils_1.shortenAddress)(address.address), icon: api_1.Icon.Star, accessories: [
                    ...address.tags.map((tag) => ({ tag: { value: tag, color: "#4A90E2" } })),
                    { text: `${address.chains.length} chain${address.chains.length === 1 ? "" : "s"}` },
                ], detail: (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { markdown: `# ${address.label}\n\n\`\`\`\n${address.address}\n\`\`\`\n\n${address.notes ? `**Notes:** ${address.notes}` : ""}`, metadata: (0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Address", text: address.address }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList, { title: "Tags", children: address.tags.length > 0 ? (address.tags.map((tag) => (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { text: tag }, tag))) : ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { text: "None", color: "#999" })) }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Associated Chains", text: address.chains.join(", ") || "None" }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Created", text: new Date(address.createdAt).toLocaleDateString() }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Last Used", text: new Date(address.lastUsed).toLocaleDateString() })] }) }), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Actions", children: [address.chains.map((chainId) => ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { title: `Open on Chain ${chainId}`, url: `https://etherscan.io/address/${address.address}`, icon: api_1.Icon.Globe, onOpen: () => handleOpenExplorer(address) }, chainId))), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Edit Address", icon: api_1.Icon.Pencil, shortcut: { modifiers: ["cmd"], key: "e" }, onAction: () => push((0, jsx_runtime_1.jsx)(save_address_form_1.default, { address: address.address, chainId: address.chains[0], chainName: `Chain ${address.chains[0]}`, allExplorers: allExplorers, existingEntry: address, onSaved: loadAddresses })) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Paste Address from Clipboard", icon: api_1.Icon.Clipboard, shortcut: { modifiers: ["cmd"], key: "return" }, onAction: handlePasteAddress })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Copy", children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: address.address, title: "Copy Address", shortcut: { modifiers: ["cmd"], key: "c" } }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: address.label, title: "Copy Label" }), address.notes && (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: address.notes, title: "Copy Notes" })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Export", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export All as JSON", icon: api_1.Icon.Document, onAction: () => handleExport("json"), shortcut: { modifiers: ["cmd", "shift"], key: "j" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export All as Csv", icon: api_1.Icon.Document, onAction: () => handleExport("csv"), shortcut: { modifiers: ["cmd", "shift"], key: "c" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export All as Markdown", icon: api_1.Icon.Document, onAction: () => handleExport("markdown"), shortcut: { modifiers: ["cmd", "shift"], key: "m" } })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Manage", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Address", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" }, onAction: () => handleDelete(address) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Refresh List", icon: api_1.Icon.ArrowClockwise, shortcut: { modifiers: ["cmd"], key: "r" }, onAction: loadAddresses })] })] }) }, address.id))) })) }));
}
