import type Pocketbase from "pocketbase";
import { getClient } from "../helpers/get-client";
import { usePromise } from "@raycast/utils";

/**
 * Returns a client instance.
 *
 * @returns A client instance or undefined if the client is not yet initialized.
 */
export function useClient(): Pocketbase | undefined {
  const { data: client } = usePromise(getClient);
  return client;
}
