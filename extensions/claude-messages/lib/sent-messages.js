"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
// @ts-nocheck
const api_1 = require("@raycast/api");
const react_1 = require("react");
const claudeMessages_1 = require("./utils/claudeMessages");
function SentMessages() {
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        async function loadMessages() {
            try {
                const sentMessages = await (0, claudeMessages_1.getSentMessages)();
                setMessages(sentMessages);
            }
            catch (error) {
                (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Error loading messages",
                    message: String(error)
                });
            }
            finally {
                setIsLoading(false);
            }
        }
        loadMessages();
    }, []);
    async function copyMessage(message) {
        try {
            const fullMessage = (0, claudeMessages_1.formatMessageForDisplay)(message);
            await api_1.Clipboard.copy(fullMessage);
            (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Copied to clipboard",
                message: "Message copied successfully"
            });
        }
        catch (error) {
            (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Copy failed",
                message: String(error)
            });
        }
    }
    async function copyContent(message) {
        try {
            await api_1.Clipboard.copy(message.content);
            (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Content copied",
                message: "Message content copied to clipboard"
            });
        }
        catch (error) {
            (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Copy failed",
                message: String(error)
            });
        }
    }
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, searchBarPlaceholder: "Search your sent messages...", children: (0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [messages.length === 0 && !isLoading && ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No messages found", description: "No sent messages found in your Claude history" })), messages.map((message) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: message.preview, subtitle: message.timestamp.toLocaleString(), accessories: [
                        { text: `Session: ${message.sessionId.slice(0, 8)}...` }
                    ], actions: 
                    // @ts-ignore
                    (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy Full Message", onAction: () => copyMessage(message) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy Content Only", onAction: () => copyContent(message) }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Preview", content: message.preview })] }) }, message.id)))] }) }));
}
exports.default = SentMessages;
