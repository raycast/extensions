import { Tool } from "@raycast/api";
import queryEmailAndCalendar, { confirmation as upstreamConfirmation } from "./query-email-and-calendar";

/**
 * Deprecated: use `query-email-and-calendar` (the flagship cross-source
 * tool) instead. This entry point remains so existing Raycast workflows
 * keep working; it delegates to the new tool unchanged.
 */
type Input = {
  /** Natural-language query or Superhuman-operator search. */
  query: string;
};

export const confirmation: Tool.Confirmation<Input> = upstreamConfirmation;

export default async function tool(input: Input): Promise<unknown> {
  return queryEmailAndCalendar(input);
}
