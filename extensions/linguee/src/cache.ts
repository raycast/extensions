import LRU from "lru-cache";

export const cache = new LRU({ max: 100 });
