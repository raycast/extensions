"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const storage_1 = require("./utils/storage");
function Command() {
    const [history, setHistory] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const loadHistory = async () => {
            try {
                const loaded = await (0, storage_1.getSearchHistory)();
                console.log("Loaded history:", loaded);
                setHistory(loaded);
                (0, api_1.showToast)({ title: "History Loaded", message: `${loaded.length} items` });
            }
            catch (error) {
                console.error("Error loading history:", error);
                (0, api_1.showToast)({ title: "Error", message: String(error) });
            }
            finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);
    const addTestItem = async () => {
        const testItem = {
            id: `test-${Date.now()}`,
            query: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            type: "address",
            chainId: 1,
            chainName: "Ethereum",
            timestamp: Date.now(),
            url: "https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        };
        await (0, storage_1.addToHistory)(testItem);
        const updated = await (0, storage_1.getSearchHistory)();
        setHistory(updated);
        (0, api_1.showToast)({ title: "Test Added", message: `Now ${updated.length} items` });
    };
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, children: [(0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Add Test History Item", subtitle: "Click to add a test item", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Add Test", onAction: addTestItem }) }) }), history.map((item) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: item.query, subtitle: `${item.type} on ${item.chainName}`, accessories: [{ text: new Date(item.timestamp).toLocaleString() }] }, item.id))), history.length === 0 && !isLoading && (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No history", description: "History is empty" })] }));
}
