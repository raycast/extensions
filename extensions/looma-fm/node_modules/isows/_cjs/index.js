"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocket = void 0;
const WebSocket_ = require("ws");
const utils_js_1 = require("./utils.js");
exports.WebSocket = (() => {
    try {
        return (0, utils_js_1.getNativeWebSocket)();
    }
    catch {
        if (WebSocket_.WebSocket)
            return WebSocket_.WebSocket;
        return WebSocket_;
    }
})();
//# sourceMappingURL=index.js.map