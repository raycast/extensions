export class LimitedMap<K, V> extends Map<K, V> {
  private limit: number;

  constructor(limit: number) {
    super();
    this.limit = limit;
  }

  set(key: K, value: V): this {
    if (this.size >= this.limit) {
      // Delete the first key-value pair
      this.delete(this.keys().next().value);
    }
    super.set(key, value);
    return this;
  }
}
