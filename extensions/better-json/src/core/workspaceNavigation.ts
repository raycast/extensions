import type { JsonDocument } from "./document";

// Native navigation pops are batched. Request one pop per mounted route instead
// of calling pop() repeatedly in a single event, which can leave stale pages.
export class WorkspaceNavigation {
  private routes: symbol[] = [];
  private listeners = new Set<() => void>();
  private pending?: JsonDocument;
  private version = 0;

  constructor(private accept: (document: JsonDocument) => void) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.version;

  addRoute(): symbol {
    const id = Symbol("document-route");
    this.routes.push(id);
    this.notify();
    return id;
  }

  shouldPop(id: symbol): boolean {
    return this.pending !== undefined && this.routes.at(-1) === id;
  }

  didPop(id: symbol) {
    this.routes = this.routes.filter((route) => route !== id);
    this.finishOrNotify();
  }

  replace = (document: JsonDocument) => {
    this.pending = document;
    this.finishOrNotify();
  };

  private finishOrNotify() {
    if (this.pending && this.routes.length === 0) {
      const document = this.pending;
      this.pending = undefined;
      this.accept(document);
    }
    this.notify();
  }

  private notify() {
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}
