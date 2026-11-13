import { usePromise } from "@raycast/utils";
import { listCollections } from "../lib/replicate";
import { DAY_MS, cached } from "../lib/cache";

export const useCollections = () => usePromise(() => cached("collections", DAY_MS, listCollections), []);
