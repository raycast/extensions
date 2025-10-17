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
const chains = __importStar(require("viem/chains"));
const custom_chains_1 = require("./custom-chains");
const configure_explorer_1 = __importDefault(require("./configure-explorer"));
const explorer_configs_1 = require("./explorer-configs");
const add_custom_chain_1 = __importDefault(require("./add-custom-chain"));
// Store chain data for later access
const chainDataMap = new Map();
const createExplorersFromChains = () => {
    // Combine viem chains with our custom chains
    const allChains = [...Object.values(chains), ...custom_chains_1.customChains];
    // Deduplicate by chainId, keeping the first occurrence
    const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());
    return uniqueChains
        .filter((chain) => chain.blockExplorers?.default !== undefined)
        .map((chain) => {
        if (!chain.blockExplorers?.default) {
            throw new Error("Chain should have default explorer");
        }
        // Store chain data for RPC URL access
        chainDataMap.set(chain.id, chain);
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
const explorers = createExplorersFromChains();
const defaultExplorer = explorers.find((explorer) => explorer.chainId === 1) || explorers[0];
function Command() {
    const [selectedExplorer, setSelectedExplorer] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [explorersList, setExplorersList] = (0, react_1.useState)(explorers);
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                // Load custom configs
                const customConfigsJson = await api_1.LocalStorage.getItem("custom-explorer-configs");
                const customConfigs = customConfigsJson ? JSON.parse(customConfigsJson) : {};
                // Load user-added custom chains
                const userChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
                const userChains = userChainsJson ? JSON.parse(userChainsJson) : [];
                // Combine built-in and user chains
                const allExplorers = [...explorers, ...userChains];
                // Apply custom configs to explorers
                const updatedExplorers = allExplorers.map((explorer) => {
                    if (customConfigs[explorer.chainId]) {
                        return { ...explorer, config: customConfigs[explorer.chainId] };
                    }
                    return explorer;
                });
                setExplorersList(updatedExplorers);
                // Load selected explorer
                const selectedExplorerFromStorage = await api_1.LocalStorage.getItem("selected-explorer");
                if (selectedExplorerFromStorage) {
                    try {
                        const parsedExplorer = JSON.parse(selectedExplorerFromStorage);
                        // Apply custom config if available
                        const explorerWithConfig = updatedExplorers.find((e) => e.chainId === parsedExplorer.chainId);
                        setSelectedExplorer(explorerWithConfig || parsedExplorer);
                    }
                    catch (error) {
                        setSelectedExplorer(defaultExplorer);
                        console.log(error);
                    }
                }
                else {
                    setSelectedExplorer(defaultExplorer);
                }
            }
            catch (error) {
                console.error("Error loading from storage:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);
    const { pop, push } = (0, api_1.useNavigation)();
    const handleExplorerChange = async (explorer) => {
        try {
            await api_1.LocalStorage.setItem("selected-explorer", JSON.stringify(explorer));
            setSelectedExplorer(explorer);
            pop();
            (0, api_1.showToast)({ title: "Explorer changed", message: `${explorer.chainName}` });
        }
        catch (error) {
            console.error("Error saving explorer:", error);
            (0, api_1.showToast)({ title: "Error", message: "Failed to save explorer selection" });
        }
    };
    const handleConfigUpdate = async (updatedExplorer) => {
        // Update the explorers list
        const updatedList = explorersList.map((e) => (e.chainId === updatedExplorer.chainId ? updatedExplorer : e));
        setExplorersList(updatedList);
        // Update selected explorer if it's the one being configured
        if (selectedExplorer?.chainId === updatedExplorer.chainId) {
            setSelectedExplorer(updatedExplorer);
            await api_1.LocalStorage.setItem("selected-explorer", JSON.stringify(updatedExplorer));
        }
    };
    const handleChainAdded = async (newChain) => {
        // Reload all data to include the new chain
        const userChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
        const userChains = userChainsJson ? JSON.parse(userChainsJson) : [];
        const allExplorers = [...explorers, ...userChains];
        setExplorersList(allExplorers);
        (0, api_1.showToast)({
            title: "Success",
            message: `${newChain.chainName} has been added`,
        });
    };
    const handleDeleteChain = async (chain) => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Delete Custom Chain",
            message: `Are you sure you want to delete ${chain.chainName}? This action cannot be undone.`,
            primaryAction: {
                title: "Delete",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (!confirmed)
            return;
        try {
            // Load user chains
            const userChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
            const userChains = userChainsJson ? JSON.parse(userChainsJson) : [];
            // Remove the chain
            const updatedChains = userChains.filter((c) => c.chainId !== chain.chainId);
            await api_1.LocalStorage.setItem("user-custom-chains", JSON.stringify(updatedChains));
            // Update the list
            const updatedList = explorersList.filter((e) => e.chainId !== chain.chainId);
            setExplorersList(updatedList);
            // If deleted chain was selected, switch to default
            if (selectedExplorer?.chainId === chain.chainId) {
                const defaultExplorer = updatedList.find((e) => e.chainId === 1) || updatedList[0];
                setSelectedExplorer(defaultExplorer);
                await api_1.LocalStorage.setItem("selected-explorer", JSON.stringify(defaultExplorer));
            }
            (0, api_1.showToast)({
                title: "Chain Deleted",
                message: `${chain.chainName} has been removed`,
            });
        }
        catch (error) {
            console.error("Error deleting chain:", error);
            (0, api_1.showToast)({
                title: "Error",
                message: "Failed to delete chain",
            });
        }
    };
    const isUserAddedChain = (chainId) => {
        // Check if this chain was added by the user (not in built-in explorers)
        return !explorers.some((e) => e.chainId === chainId);
    };
    if (isLoading) {
        return (0, jsx_runtime_1.jsx)(api_1.List, { isLoading: true });
    }
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isShowingDetail: true, searchBarPlaceholder: "Search for an Explorer", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Add Custom Chain", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, onAction: () => push((0, jsx_runtime_1.jsx)(add_custom_chain_1.default, { onChainAdded: handleChainAdded })) }) }), children: explorersList.map((explorer) => {
            const accessories = [];
            const keywords = [
                explorer.currency,
                explorer.explorerName,
                explorer.chainId.toString(),
                explorer.testNet ? "testnet" : "mainnet",
            ];
            if (selectedExplorer?.chainId === explorer.chainId) {
                accessories.push({
                    text: "Selected",
                    icon: "✅",
                    tooltip: "The explorer used in searches.",
                });
            }
            // Show if explorer has custom configuration
            const isCustomConfigured = explorer.config !== undefined || (0, explorer_configs_1.hasCustomConfig)(explorer.baseUrl);
            if (isCustomConfigured) {
                accessories.push({
                    icon: api_1.Icon.Gear,
                    tooltip: "Custom configuration active",
                });
            }
            return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: `explorer-${explorer.chainId}`, title: explorer.chainName, subtitle: explorer.testNet ? "Testnet" : "Mainnet", icon: { source: explorer.iconUri }, keywords: keywords, accessories: accessories, detail: (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { markdown: `# ${explorer.chainName}\n[${explorer.baseUrl}](https://${explorer.baseUrl})\n${explorer.imageUrl ? `![](${explorer.imageUrl})` : ""}`, metadata: (0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Explorer Name", text: explorer.explorerName }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Currency", text: explorer.currency }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Chain ID", text: explorer.chainId.toString() }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Network Type", text: explorer.testNet ? "Testnet" : "Mainnet" }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (() => {
                                const chainData = chainDataMap.get(explorer.chainId);
                                const rpcUrl = chainData?.rpcUrls?.default?.http?.[0] || chainData?.rpcUrls?.public?.http?.[0];
                                return rpcUrl ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Link, { title: "RPC URL", text: rpcUrl, target: rpcUrl }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {})] })) : null;
                            })()] }) }), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Explorer Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://${explorer.baseUrl}` }), (0, jsx_runtime_1.jsx)(api_1.Action, { icon: api_1.Icon.ArrowClockwise, title: "Change Explorer", onAction: () => handleExplorerChange(explorer) })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Configuration", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { icon: api_1.Icon.Gear, title: "Configure Explorer", shortcut: { modifiers: ["cmd"], key: "e" }, onAction: () => push((0, jsx_runtime_1.jsx)(configure_explorer_1.default, { explorer: explorer, onConfigUpdate: handleConfigUpdate })) }), isUserAddedChain(explorer.chainId) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { icon: api_1.Icon.Pencil, title: "Edit Custom Chain", shortcut: { modifiers: ["cmd"], key: "u" }, onAction: () => push((0, jsx_runtime_1.jsx)(add_custom_chain_1.default, { onChainAdded: handleChainAdded, existingChain: explorer })) }), (0, jsx_runtime_1.jsx)(api_1.Action, { icon: api_1.Icon.Trash, title: "Delete Custom Chain", style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["cmd", "shift"], key: "delete" }, onAction: () => handleDeleteChain(explorer) })] }))] }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Manage Chains", children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Add Custom Chain", icon: api_1.Icon.Plus, shortcut: { modifiers: ["cmd"], key: "n" }, onAction: () => push((0, jsx_runtime_1.jsx)(add_custom_chain_1.default, { onChainAdded: handleChainAdded })) }) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Copy", children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Explorer URL", shortcut: { modifiers: ["cmd"], key: "c" }, content: `https://${explorer.baseUrl}` }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Chain ID", shortcut: { modifiers: ["cmd", "shift"], key: "i" }, content: explorer.chainId.toString(), onCopy: () => (0, api_1.showToast)({ title: "Copied", message: `Chain ID: ${explorer.chainId}` }) }), (() => {
                                    const chainData = chainDataMap.get(explorer.chainId);
                                    const rpcUrl = chainData?.rpcUrls?.default?.http?.[0] || chainData?.rpcUrls?.public?.http?.[0];
                                    return rpcUrl ? ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Rpc URL", shortcut: { modifiers: ["cmd", "shift"], key: "r" }, content: rpcUrl, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "RPC URL copied to clipboard" }) })) : null;
                                })()] })] }) }, `${explorer.chainName}-${explorer.chainId}`));
        }) }));
}
