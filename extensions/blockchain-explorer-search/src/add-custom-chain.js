"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddCustomChain;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
function AddCustomChain({ onChainAdded, existingChain }) {
    const { pop } = (0, api_1.useNavigation)();
    const isEditing = !!existingChain;
    // Basic Info
    const [chainName, setChainName] = (0, react_1.useState)(existingChain?.chainName || "");
    const [explorerName, setExplorerName] = (0, react_1.useState)(existingChain?.explorerName || "");
    const [explorerUrl, setExplorerUrl] = (0, react_1.useState)(existingChain?.baseUrl || "");
    const [chainId, setChainId] = (0, react_1.useState)(existingChain?.chainId.toString() || "");
    const [currency, setCurrency] = (0, react_1.useState)(existingChain?.currency || "");
    const [isTestnet, setIsTestnet] = (0, react_1.useState)(existingChain?.testNet || false);
    // URL Paths
    const [txPath, setTxPath] = (0, react_1.useState)(existingChain?.config?.paths?.transaction || "/tx/");
    const [addressPath, setAddressPath] = (0, react_1.useState)(existingChain?.config?.paths?.address || "/address/");
    const [blockPath, setBlockPath] = (0, react_1.useState)(existingChain?.config?.paths?.block || "/block/");
    const [tokenPath, setTokenPath] = (0, react_1.useState)(existingChain?.config?.paths?.token || "/token/");
    // Patterns (optional)
    const [addressPattern, setAddressPattern] = (0, react_1.useState)(existingChain?.config?.patterns?.address?.regex || "");
    const [txPattern, setTxPattern] = (0, react_1.useState)(existingChain?.config?.patterns?.transaction?.regex || "");
    const [errors, setErrors] = (0, react_1.useState)({});
    const validate = () => {
        const newErrors = {};
        if (!chainName.trim()) {
            newErrors.chainName = "Chain name is required";
        }
        if (!explorerName.trim()) {
            newErrors.explorerName = "Explorer name is required";
        }
        if (!explorerUrl.trim()) {
            newErrors.explorerUrl = "Explorer URL is required";
        }
        else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(explorerUrl)) {
            newErrors.explorerUrl = "Invalid URL format (e.g., etherscan.io)";
        }
        if (!chainId.trim()) {
            newErrors.chainId = "Chain ID is required";
        }
        else if (!/^\d+$/.test(chainId)) {
            newErrors.chainId = "Chain ID must be a number";
        }
        if (!currency.trim()) {
            newErrors.currency = "Currency symbol is required";
        }
        // Validate regex patterns if provided
        if (addressPattern) {
            try {
                new RegExp(addressPattern);
            }
            catch {
                newErrors.addressPattern = "Invalid regex pattern";
            }
        }
        if (txPattern) {
            try {
                new RegExp(txPattern);
            }
            catch {
                newErrors.txPattern = "Invalid regex pattern";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async () => {
        if (!validate()) {
            (0, api_1.showToast)({
                title: "Validation Error",
                message: "Please fix the errors before submitting",
            });
            return;
        }
        const customChain = {
            chainName: chainName.trim(),
            explorerName: explorerName.trim(),
            baseUrl: explorerUrl
                .trim()
                .replace(/^https?:\/\//, "")
                .replace(/\/$/, ""),
            chainId: parseInt(chainId),
            currency: currency.trim().toUpperCase(),
            iconUri: `../assets/${chainName.toLowerCase().replace(/\s+/g, "-")}.svg`,
            testNet: isTestnet,
            config: {
                paths: {
                    transaction: txPath,
                    address: addressPath,
                    block: blockPath,
                    token: tokenPath,
                },
                patterns: {},
            },
        };
        // Add patterns if provided
        if (addressPattern) {
            customChain.config.patterns.address = { regex: addressPattern };
        }
        if (txPattern) {
            customChain.config.patterns.transaction = { regex: txPattern };
        }
        try {
            // Load existing custom chains
            const customChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
            const customChains = customChainsJson ? JSON.parse(customChainsJson) : [];
            if (isEditing) {
                // Update existing chain
                const index = customChains.findIndex((c) => c.chainId === existingChain.chainId);
                if (index !== -1) {
                    customChains[index] = customChain;
                }
            }
            else {
                // Check for duplicate chain ID
                if (customChains.some((c) => c.chainId === customChain.chainId)) {
                    (0, api_1.showToast)({
                        title: "Error",
                        message: `Chain ID ${customChain.chainId} already exists`,
                    });
                    return;
                }
                customChains.push(customChain);
            }
            // Save to LocalStorage
            await api_1.LocalStorage.setItem("user-custom-chains", JSON.stringify(customChains));
            (0, api_1.showToast)({
                title: isEditing ? "Chain Updated" : "Chain Added",
                message: `${customChain.chainName} has been ${isEditing ? "updated" : "added"} successfully`,
            });
            onChainAdded(customChain);
            pop();
        }
        catch (error) {
            console.error("Error saving custom chain:", error);
            (0, api_1.showToast)({
                title: "Error",
                message: "Failed to save custom chain",
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: isEditing ? "Edit Custom Chain" : "Add Custom Chain", actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: isEditing ? "Update Chain" : "Add Chain", onSubmit: handleSubmit, icon: api_1.Icon.Check }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Cancel", onAction: pop, icon: api_1.Icon.XMarkCircle })] }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: isEditing ? "Edit Chain" : "Add New Blockchain", text: "Fill in the details for your custom blockchain explorer" }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "chainName", title: "Chain Name", placeholder: "e.g., Polygon, Avalanche, My Custom Chain", value: chainName, onChange: setChainName, error: errors.chainName, info: "Display name for the blockchain" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "explorerName", title: "Explorer Name", placeholder: "e.g., PolygonScan, SnowTrace", value: explorerName, onChange: setExplorerName, error: errors.explorerName, info: "Name of the block explorer" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "explorerUrl", title: "Explorer URL", placeholder: "e.g., polygonscan.com, snowtrace.io", value: explorerUrl, onChange: setExplorerUrl, error: errors.explorerUrl, info: "Domain only, without https:// or trailing slash" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "chainId", title: "Chain ID", placeholder: "e.g., 137, 43114", value: chainId, onChange: setChainId, error: errors.chainId, info: "Unique numeric identifier for the blockchain (check ChainList.org)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "currency", title: "Native Currency Symbol", placeholder: "e.g., MATIC, AVAX, ETH", value: currency, onChange: setCurrency, error: errors.currency, info: "Symbol of the native currency" }), (0, jsx_runtime_1.jsx)(api_1.Form.Checkbox, { id: "isTestnet", label: "This is a testnet", value: isTestnet, onChange: setIsTestnet, info: "Check if this is a test network" }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Explorer URL Paths", text: "Configure how URLs are structured on this explorer" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "txPath", title: "Transaction Path", placeholder: "/tx/", value: txPath, onChange: setTxPath, info: "URL path for transactions (e.g., /tx/, /transaction/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "addressPath", title: "Address Path", placeholder: "/address/", value: addressPath, onChange: setAddressPath, info: "URL path for addresses (e.g., /address/, /account/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "blockPath", title: "Block Path", placeholder: "/block/", value: blockPath, onChange: setBlockPath, info: "URL path for blocks" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "tokenPath", title: "Token Path", placeholder: "/token/", value: tokenPath, onChange: setTokenPath, info: "URL path for tokens" }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Pattern Matching (Optional)", text: "Define custom patterns if your chain uses non-standard address/transaction formats" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "addressPattern", title: "Address Pattern (Regex)", placeholder: "e.g., ^0x[a-fA-F0-9]{40}$ for Ethereum", value: addressPattern, onChange: setAddressPattern, error: errors.addressPattern, info: "Leave blank for standard EVM addresses" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "txPattern", title: "Transaction Pattern (Regex)", placeholder: "e.g., ^0x[a-fA-F0-9]{64}$ for Ethereum", value: txPattern, onChange: setTxPattern, error: errors.txPattern, info: "Leave blank for standard EVM transactions" }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: "\uD83D\uDCA1 Tip: Most EVM-compatible chains can leave patterns blank. For examples of non-EVM patterns, check the documentation." })] }));
}
