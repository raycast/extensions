import { EventEmitter } from "events";

export default class StreamController<T> {
  private emitter: EventEmitter;
  private isClosed: boolean;

  constructor(limit = 10) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(limit);
    this.isClosed = false;
  }

  // Add a listener
  public listen(callback: (data: T) => void): () => void {
    this.emitter.on("data", callback);

    return () => this.emitter.removeListener("data", callback);
  }

  // Add a single-use listener
  public listenOnce(callback: (data: T) => void): void {
    this.emitter.once("data", callback);
  }

  // Emit data
  public add(data: T): void {
    if (this.isClosed) {
      throw new Error("Stream is closed");
    }
    this.emitter.emit("data", data);
  }

  // Close the stream
  public close(): void {
    this.isClosed = true;
    this.emitter.removeAllListeners("data");
  }
}
