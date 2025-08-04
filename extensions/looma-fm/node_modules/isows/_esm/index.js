import * as WebSocket_ from "ws";
import { getNativeWebSocket } from "./utils.js";
export const WebSocket = (() => {
    try {
        return getNativeWebSocket();
    }
    catch {
        if (WebSocket_.WebSocket)
            return WebSocket_.WebSocket;
        return WebSocket_;
    }
})();
//# sourceMappingURL=index.js.map