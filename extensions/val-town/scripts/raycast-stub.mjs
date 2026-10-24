// Stands in for @raycast/api, which only loads inside Raycast, so the tools run under Node.
const named = new Proxy({}, { get: (_, key) => String(key) });

export const getPreferenceValues = () => ({ apiToken: process.env.VAL_TOWN_TOKEN });
export const environment = { canAccess: () => false };
export const AI = {};
export const Color = named;
export const Icon = named;

export class Cache {
  #entries = new Map();

  get(key) {
    return this.#entries.get(key);
  }

  set(key, value) {
    this.#entries.set(key, value);
  }

  remove(key) {
    this.#entries.delete(key);
  }
}
