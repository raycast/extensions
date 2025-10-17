"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConfigureExplorer;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
function ConfigureExplorer({ explorer, onConfigUpdate }) {
    const { pop } = (0, api_1.useNavigation)();
    const [config] = (0, react_1.useState)(explorer.config || {});
    // Path configuration
    const [txPath, setTxPath] = (0, react_1.useState)(config.paths?.transaction || "/tx/");
    const [addressPath, setAddressPath] = (0, react_1.useState)(config.paths?.address || "/address/");
    const [blockPath, setBlockPath] = (0, react_1.useState)(config.paths?.block || "/block/");
    const [tokenPath, setTokenPath] = (0, react_1.useState)(config.paths?.token || "/token/");
    const [ensPath, setEnsPath] = (0, react_1.useState)(config.paths?.ens || "/enslookup-search?search=");
    const [signaturePath, setSignaturePath] = (0, react_1.useState)(config.paths?.signature || "/tx/");
    // Pattern configuration
    const [txPattern, setTxPattern] = (0, react_1.useState)(config.patterns?.transaction?.regex || "");
    const [addressPattern, setAddressPattern] = (0, react_1.useState)(config.patterns?.address?.regex || "");
    const [blockPattern, setBlockPattern] = (0, react_1.useState)(config.patterns?.block?.regex || "");
    const [signaturePattern, setSignaturePattern] = (0, react_1.useState)(config.patterns?.signature?.regex || "");
    const [ensPattern, setEnsPattern] = (0, react_1.useState)(config.patterns?.ens?.regex || "");
    const handleSubmit = async () => {
        const paths = {
            transaction: txPath,
            address: addressPath,
            block: blockPath,
            token: tokenPath,
            ens: ensPath,
            signature: signaturePath,
        };
        const patterns = {};
        if (txPattern) {
            patterns.transaction = { regex: txPattern };
        }
        if (addressPattern) {
            patterns.address = { regex: addressPattern };
        }
        if (blockPattern) {
            patterns.block = { regex: blockPattern };
        }
        if (signaturePattern) {
            patterns.signature = { regex: signaturePattern };
        }
        if (ensPattern) {
            patterns.ens = { regex: ensPattern };
        }
        const newConfig = {
            paths,
            patterns: Object.keys(patterns).length > 0 ? patterns : undefined,
        };
        const updatedExplorer = { ...explorer, config: newConfig };
        try {
            // Save to custom configs storage
            const customConfigsJson = await api_1.LocalStorage.getItem("custom-explorer-configs");
            const customConfigs = customConfigsJson ? JSON.parse(customConfigsJson) : {};
            customConfigs[explorer.chainId] = newConfig;
            await api_1.LocalStorage.setItem("custom-explorer-configs", JSON.stringify(customConfigs));
            onConfigUpdate(updatedExplorer);
            (0, api_1.showToast)({
                title: "Configuration Saved",
                message: `Custom configuration for ${explorer.chainName} has been saved`,
            });
            pop();
        }
        catch (error) {
            console.error("Error saving configuration:", error);
            (0, api_1.showToast)({
                title: "Error",
                message: "Failed to save explorer configuration",
            });
        }
    };
    const handleReset = async () => {
        try {
            // Remove from custom configs
            const customConfigsJson = await api_1.LocalStorage.getItem("custom-explorer-configs");
            const customConfigs = customConfigsJson ? JSON.parse(customConfigsJson) : {};
            delete customConfigs[explorer.chainId];
            await api_1.LocalStorage.setItem("custom-explorer-configs", JSON.stringify(customConfigs));
            const resetExplorer = { ...explorer, config: undefined };
            onConfigUpdate(resetExplorer);
            (0, api_1.showToast)({
                title: "Configuration Reset",
                message: `Custom configuration for ${explorer.chainName} has been reset to defaults`,
            });
            pop();
        }
        catch (error) {
            console.error("Error resetting configuration:", error);
            (0, api_1.showToast)({
                title: "Error",
                message: "Failed to reset explorer configuration",
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { navigationTitle: `Configure ${explorer.chainName} Explorer`, actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Save Configuration", onSubmit: handleSubmit, icon: api_1.Icon.Check }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Reset to Defaults", onAction: handleReset, icon: api_1.Icon.Undo, style: api_1.Action.Style.Destructive })] }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Explorer Configuration", text: `Customize paths and patterns for ${explorer.explorerName} on ${explorer.chainName}` }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "URL Paths", text: "Configure the URL paths for different types of searches" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "txPath", title: "Transaction Path", placeholder: "/tx/", value: txPath, onChange: setTxPath, info: "URL path for transactions (e.g., /tx/, /transaction/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "addressPath", title: "Address Path", placeholder: "/address/", value: addressPath, onChange: setAddressPath, info: "URL path for addresses (e.g., /address/, /account/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "blockPath", title: "Block Path", placeholder: "/block/", value: blockPath, onChange: setBlockPath, info: "URL path for blocks (e.g., /block/, /blocks/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "tokenPath", title: "Token Path", placeholder: "/token/", value: tokenPath, onChange: setTokenPath, info: "URL path for tokens (e.g., /token/, /coin/)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "signaturePath", title: "Signature Path", placeholder: "/tx/", value: signaturePath, onChange: setSignaturePath, info: "URL path for signatures (primarily for non-EVM chains like Solana)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "ensPath", title: "ENS/Name Path", placeholder: "/enslookup-search?search=", value: ensPath, onChange: setEnsPath, info: "URL path for ENS or name lookups" }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Pattern Matching (Optional)", text: "Define custom regex patterns to match specific input formats. Leave blank to use defaults." }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "txPattern", title: "Transaction Pattern", placeholder: "^0x[a-fA-F0-9]{64}$", value: txPattern, onChange: setTxPattern, info: "Regex pattern to match transaction hashes (e.g., ^0x[a-fA-F0-9]{64}$ for EVM)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "addressPattern", title: "Address Pattern", placeholder: "^0x[a-fA-F0-9]{40}$", value: addressPattern, onChange: setAddressPattern, info: "Regex pattern to match addresses" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "signaturePattern", title: "Signature Pattern", placeholder: "^[1-9A-HJ-NP-Za-km-z]{87,88}$", value: signaturePattern, onChange: setSignaturePattern, info: "Regex pattern to match signatures (e.g., base58 for Solana)" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "blockPattern", title: "Block Pattern", placeholder: "^\\\\d+$", value: blockPattern, onChange: setBlockPattern, info: "Regex pattern to match block numbers/hashes" }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "ensPattern", title: "ENS/Name Pattern", placeholder: "^.+\\\\.eth$", value: ensPattern, onChange: setEnsPattern, info: "Regex pattern to match ENS or name service entries" })] }));
}
