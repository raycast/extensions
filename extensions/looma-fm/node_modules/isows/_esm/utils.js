export function getNativeWebSocket() {
    if (typeof WebSocket !== "undefined")
        return WebSocket;
    if (typeof global.WebSocket !== "undefined")
        return global.WebSocket;
    if (typeof window.WebSocket !== "undefined")
        return window.WebSocket;
    if (typeof self.WebSocket !== "undefined")
        return self.WebSocket;
    throw new Error("`WebSocket` is not supported in this environment");
}
//# sourceMappingURL=utils.js.map