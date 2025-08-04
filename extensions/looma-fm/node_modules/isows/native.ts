import { getNativeWebSocket } from "./utils.js";

export const WebSocket = getNativeWebSocket();

type MessageEvent_ = MessageEvent;
export type { MessageEvent_ as MessageEvent };
