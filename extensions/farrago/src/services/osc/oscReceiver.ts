import dgram from "dgram";
import * as osc from "osc-min";

export type OscMessageHandler = (msg: osc.OscMessageOutput, receiver: OscReceiver) => void;

export class OscReceiver {
  private isOpened: boolean;
  private socket: dgram.Socket;
  private messageHandlers: Map<string, [RegExp, Set<OscMessageHandler>]>;
  private messagehandlersRegexMap: Map<OscMessageHandler, Set<string>>;

  constructor(
    private remoteHost: string,
    private remotePort: number,
  ) {
    this.messageHandlers = new Map();
    this.messagehandlersRegexMap = new Map();
    this.socket = this.createSocket();
    this.isOpened = false;
  }

  private createSocket() {
    return dgram.createSocket("udp4");
  }

  open() {
    this.socket = this.createSocket()
      .on("message", (msg) => this.handleMessages(msg))
      .bind(this.remotePort, this.remoteHost);
    this.isOpened = true;
  }

  close() {
    this.socket.close();
    this.isOpened = false;
  }

  isClosed() {
    return !this.isOpened;
  }

  protected addMessageHandler(rgx: RegExp, handler: OscMessageHandler) {
    if (!this.messageHandlers.has(rgx.source)) {
      this.messageHandlers.set(rgx.source, [rgx, new Set()]);
    }
    const [, handlersSet] = this.messageHandlers.get(rgx.source)!;
    handlersSet.add(handler);

    if (!this.messagehandlersRegexMap.has(handler)) {
      this.messagehandlersRegexMap.set(handler, new Set());
    }
    this.messagehandlersRegexMap.get(handler)!.add(rgx.source);

    return handler;
  }

  protected removeMessageHandler(handler: OscMessageHandler) {
    const rgxSources = this.messagehandlersRegexMap.get(handler);
    if (!rgxSources) return;

    const emptySourceKeys: string[] = [];
    rgxSources.forEach((source) => {
      const [, handlers] = this.messageHandlers?.get(source) ?? [];
      if (!handlers) return;
      handlers.delete(handler);
      if (!handlers.size) emptySourceKeys.push(source);
    });

    this.messagehandlersRegexMap.delete(handler);
    emptySourceKeys.forEach((source) => this.messageHandlers.delete(source));
  }

  private handleMessages(msgBuffer: Buffer) {
    const messages = this.extractOscMessages(msgBuffer);
    messages.forEach((msg) => this.handleOscMessage(msg));
  }

  private handleOscMessage(msg: osc.OscMessageOutput) {
    for (const [rgx, handlers] of this.messageHandlers.values()) {
      if (rgx.exec(msg.address)) {
        handlers.forEach((handler) => handler(msg, this));
      }
    }
  }

  private extractOscMessages(msg: Buffer): osc.OscMessageOutput[] {
    const decoded = this.parseBuffer(msg);
    if (!decoded) return [];

    function flatten(bundleOrMessage: osc.OscPacketOutput): osc.OscMessageOutput[] {
      const messages: osc.OscMessageOutput[] = [];

      if (bundleOrMessage.oscType === "bundle" && Array.isArray(bundleOrMessage.elements)) {
        for (const el of bundleOrMessage.elements) {
          messages.push(...flatten(el));
        }
      } else if (bundleOrMessage.oscType === "message") {
        messages.push(bundleOrMessage);
      }
      return messages;
    }

    return flatten(decoded);
  }

  private parseBuffer(msg: Buffer): osc.OscPacketOutput | null {
    try {
      return osc.fromBuffer(msg);
    } catch (err) {
      if (isOscNullCharacterError(err)) {
        console.warn(`encountered ${err.name} – "${err.message}"`);
        return null;
      } else {
        throw err;
      }
    }
  }
}

// idk what this error is, throws unpredictably
// osc-min failing to parse message from Farrago
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOscNullCharacterError(error: any): error is Error {
  return error.name == "OSCError" && error.message == "All osc-strings must contain a null character";
}
