import { useFetch } from "@raycast/utils";
import { Prettify } from "../utilities/types/prettify";

type UseFetchOptions<T = unknown, U = undefined> = Prettify<Parameters<typeof useFetch<T, U>>[1]>;

export { type UseFetchOptions };
