import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import type { Plain } from "./serializers";

/**
 * Wraps an AI tool with Linear authorization and requires its result to be plain data.
 *
 * Returning a Linear SDK model, a relation Promise, a Date, or a `Record<string, unknown>` is a type
 * error. Use the serializers in `./serializers` to shape results instead.
 */
export function withLinear<Input, Output extends Plain>(fn: (input: Input) => Promise<Output>) {
  return withAccessToken(linear)(fn) as (input: Input) => Promise<Output>;
}
