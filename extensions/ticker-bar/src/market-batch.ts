export function createMicroBatcher<Key, Value>(
  load: (keys: Key[]) => Promise<Map<Key, Value>>,
) {
  type Pending = {
    resolve: (value: Value | undefined) => void;
    reject: (error: unknown) => void;
  };

  let queue = new Map<Key, Pending[]>();
  let scheduled = false;

  async function flush() {
    const batch = queue;
    queue = new Map();
    scheduled = false;
    try {
      const values = await load([...batch.keys()]);
      batch.forEach((pending, key) => {
        const value = values.get(key);
        pending.forEach(({ resolve }) => resolve(value));
      });
    } catch (error) {
      batch.forEach((pending) => {
        pending.forEach(({ reject }) => reject(error));
      });
    }
  }

  return (key: Key): Promise<Value | undefined> =>
    new Promise((resolve, reject) => {
      const pending = queue.get(key) ?? [];
      pending.push({ resolve, reject });
      queue.set(key, pending);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    });
}
