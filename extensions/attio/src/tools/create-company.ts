import type { Tool } from "@raycast/api";
import { createRecord } from "../api/endpoints";

type Input = {
  /** The company's name, e.g. "Attio". */
  name: string;
  /** The company's website domain, e.g. "attio.com" — no protocol or path. */
  domain?: string;
  /** A short free-text description of the company. */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this company in Attio?",
  info: [
    { name: "Name", value: input.name },
    ...(input.domain ? [{ name: "Domain", value: input.domain }] : []),
    ...(input.description ? [{ name: "Description", value: input.description }] : []),
  ],
});

/** Create a new company record in Attio. */
export default async function tool(input: Input) {
  const values: Record<string, unknown[]> = { name: [input.name] };
  if (input.domain) values.domains = [input.domain];
  if (input.description) values.description = [input.description];
  const { data } = await createRecord("companies", { data: { values } });
  return { record_id: data.id.record_id, url: data.web_url };
}
