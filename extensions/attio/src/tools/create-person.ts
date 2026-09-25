import type { Tool } from "@raycast/api";
import { createRecord } from "../api/endpoints";
import { personalNameToWire } from "../lib/edit-mapping";

type Input = {
  /** The person's full name, e.g. "Ada Lovelace". */
  name: string;
  /** The person's email address. */
  email_address?: string;
  /** The person's job title. */
  job_title?: string;
  /** A short free-text description of the person. */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this person in Attio?",
  info: [
    { name: "Name", value: input.name },
    ...(input.email_address ? [{ name: "Email", value: input.email_address }] : []),
    ...(input.job_title ? [{ name: "Job title", value: input.job_title }] : []),
    ...(input.description ? [{ name: "Description", value: input.description }] : []),
  ],
});

/** Create a new person record in Attio. */
export default async function tool(input: Input) {
  const values: Record<string, unknown[]> = { name: personalNameToWire(input.name) };
  if (input.email_address) values.email_addresses = [input.email_address];
  if (input.job_title) values.job_title = [input.job_title];
  if (input.description) values.description = [input.description];
  const { data } = await createRecord("people", { data: { values } });
  return { record_id: data.id.record_id, url: data.web_url };
}
