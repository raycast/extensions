export function withCache(fn, options) {
  const store = new Map();
  const wrapped = async (...args) => {
    const key = JSON.stringify(args);
    const cached = store.get(key);
    if (cached) {
      const { data, timestamp } = cached;
      const isExpired =
        options?.maxAge && Date.now() - timestamp > options.maxAge;
      if (!isExpired && (!options?.validate || options.validate(data))) {
        return data;
      }
    }
    const result = await fn(...args);
    store.set(key, { data: result, timestamp: Date.now() });
    return result;
  };
  wrapped.clearCache = () => {
    store.clear();
  };
  return wrapped;
}
