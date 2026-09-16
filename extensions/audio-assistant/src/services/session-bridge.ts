/** Routes share a single root-owned session, including its mutation lock and refreshed state. */
export class SessionBridge<T> {
  private value: T | undefined;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  publish(value: T) {
    this.value = value;
    for (const listener of this.listeners) listener();
  }
}
