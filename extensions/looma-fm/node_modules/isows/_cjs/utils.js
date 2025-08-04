"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNativeWebSocket = void 0;
function getNativeWebSocket() {
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
exports.getNativeWebSocket = getNativeWebSocket;
//# sourceMappingURL=utils.js.map