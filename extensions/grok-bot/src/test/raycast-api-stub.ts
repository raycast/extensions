export const environment = {
  supportPath: "/tmp/grok-bot-test-support",
};

const cacheStore = new Map<string, Map<string, string>>();

export class Cache {
  private namespace: string;

  constructor(options: { namespace: string }) {
    this.namespace = options.namespace;
  }

  get(key: string): string | undefined {
    return cacheStore.get(this.namespace)?.get(key);
  }

  set(key: string, value: string): void {
    let bucket = cacheStore.get(this.namespace);
    if (!bucket) {
      bucket = new Map();
      cacheStore.set(this.namespace, bucket);
    }
    bucket.set(key, value);
  }

  remove(key: string): boolean {
    const bucket = cacheStore.get(this.namespace);
    if (!bucket || !bucket.has(key)) {
      return false;
    }
    return bucket.delete(key);
  }

  clear(): void {
    cacheStore.delete(this.namespace);
  }
}

export const Image = {
  Mask: {
    Circle: "circle",
  },
};

const storage = new Map<string, string | number | boolean>();

export const LocalStorage = {
  async getItem(key: string) {
    return storage.get(key);
  },
  async setItem(key: string, value: string | number | boolean) {
    storage.set(key, value);
  },
  async removeItem(key: string) {
    storage.delete(key);
  },
};
