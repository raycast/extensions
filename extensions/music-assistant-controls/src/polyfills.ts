import WS from "isomorphic-ws"; // polyfill for isomorphic ws
globalThis.WebSocket = globalThis.WebSocket || WS; // set global WebSocket to the polyfill

globalThis.CustomEvent =
  globalThis.CustomEvent ||
  class CustomEvent<T> extends Event {
    detail: T;
    constructor(message: string, data: EventInit & { detail: T }) {
      super(message, data);
      this.detail = data.detail;
    }
  };
