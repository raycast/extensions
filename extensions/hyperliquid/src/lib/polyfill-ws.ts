// Raycast's Node runtime does not expose a global `WebSocket`, but
// `@nktkas/hyperliquid` re-exports a reconnecting WebSocket whose module body
// reads `WebSocket.CLOSED` at load time. Importing anything from the SDK root
// therefore throws `ReferenceError: WebSocket is not defined` before any code
// runs. Provide the `ws` implementation as the global, once, as a no-op when a
// native global already exists (e.g. browser, Node 22+).
import WebSocket from "ws";

// `ws` is runtime-compatible with the reconnecting socket but its type is not
// structurally assignable to the strict global `WebSocket`, so treat the global
// as an opaque record for this one assignment.
const globalRef = globalThis as unknown as { WebSocket?: unknown };

if (typeof globalRef.WebSocket === "undefined") {
  globalRef.WebSocket = WebSocket;
}
