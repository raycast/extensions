export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function createLocalStorageStub(storage = new Map()) {
  return {
    storage,
    LocalStorage: {
      async getItem(key) {
        return storage.get(key);
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
      async removeItem(key) {
        storage.delete(key);
      },
    },
  };
}

export function jsonResponse(body, status = 200, statusText = "OK") {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

export function binaryResponse(body, status = 200, statusText = "OK") {
  return new Response(Buffer.from(body), { status, statusText });
}

export async function expectRejects(fn, predicate, message) {
  try {
    await fn();
  } catch (error) {
    assert(predicate(error), message);
    return error;
  }
  throw new Error(message);
}

export function installFetch(fetchCalls, handler) {
  fetchCalls.length = 0;
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), init, body: init.body ? JSON.parse(String(init.body)) : null };
    fetchCalls.push(call);
    if (init.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    return handler(call);
  };
}
