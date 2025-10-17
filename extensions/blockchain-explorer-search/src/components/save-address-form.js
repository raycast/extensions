"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SaveAddressForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const storage_1 = require("../utils/storage");
function SaveAddressForm({ address, chainId, chainName, allExplorers, existingEntry, onSaved, }) {
    const { pop } = (0, api_1.useNavigation)();
    const [label, setLabel] = (0, react_1.useState)(existingEntry?.label || "");
    const [tags, setTags] = (0, react_1.useState)(existingEntry?.tags.join(", ") || "");
    const [notes, setNotes] = (0, react_1.useState)(existingEntry?.notes || "");
    const [selectedChains, setSelectedChains] = (0, react_1.useState)(existingEntry?.chains.map(String) || [chainId.toString()]);
    // Get unique chains, sorted by name
    const availableChains = allExplorers
        ?.filter((e, index, self) => self.findIndex((exp) => exp.chainId === e.chainId) === index)
        .sort((a, b) => a.chainName.localeCompare(b.chainName)) || [];
    const handleSubmit = async () => {
        if (!label.trim()) {
            (0, api_1.showToast)({ title: "Error", message: "Label is required" });
            return;
        }
        const tagArray = tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        const chainIds = selectedChains.map((c) => parseInt(c, 10));
        if (existingEntry) {
            // Update existing
            await (0, storage_1.updateSavedAddress)(existingEntry.id, {
                label: label.trim(),
                tags: tagArray,
                chains: chainIds,
                notes: notes.trim() || undefined,
            });
            (0, api_1.showToast)({ title: "Updated", message: `Updated "${label}"` });
        }
        else {
            // Create new
            const newAddress = {
                id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                address,
                label: label.trim(),
                tags: tagArray,
                chains: chainIds,
                notes: notes.trim() || undefined,
                createdAt: Date.now(),
                lastUsed: Date.now(),
            };
            await (0, storage_1.saveAddress)(newAddress);
            (0, api_1.showToast)({ title: "Saved", message: `Saved "${label}" to address book` });
        }
        if (onSaved)
            onSaved();
        pop();
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: existingEntry ? "Update Address" : "Save Address", onSubmit: handleSubmit }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "address", title: "Address", value: address, onChange: () => {
                    /* read-only */
                } }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "label", title: "Label", placeholder: "e.g., Vitalik, Uniswap V3, My Cold Wallet", value: label, onChange: setLabel }), (0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "tags", title: "Tags", placeholder: "e.g., DeFi, Personal, Watching (comma-separated)", value: tags, onChange: setTags }), (0, jsx_runtime_1.jsx)(api_1.Form.TagPicker, { id: "chains", title: "Associate with Chains", value: selectedChains, onChange: setSelectedChains, children: availableChains.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [availableChains
                            .filter((e) => !e.testNet)
                            .map((explorer) => ((0, jsx_runtime_1.jsx)(api_1.Form.TagPicker.Item, { value: explorer.chainId.toString(), title: explorer.chainName, icon: { source: explorer.iconUri } }, explorer.chainId))), availableChains.filter((e) => e.testNet).length > 0 && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: availableChains
                                .filter((e) => e.testNet)
                                .map((explorer) => ((0, jsx_runtime_1.jsx)(api_1.Form.TagPicker.Item, { value: explorer.chainId.toString(), title: `${explorer.chainName} (Testnet)`, icon: { source: explorer.iconUri } }, explorer.chainId))) }))] })) : ((0, jsx_runtime_1.jsx)(api_1.Form.TagPicker.Item, { value: chainId.toString(), title: chainName, icon: api_1.Icon.Link })) }), (0, jsx_runtime_1.jsx)(api_1.Form.TextArea, { id: "notes", title: "Notes", placeholder: "Optional notes about this address", value: notes, onChange: setNotes }), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { text: existingEntry ? "Update this saved address" : "Save this address to your address book" })] }));
}
