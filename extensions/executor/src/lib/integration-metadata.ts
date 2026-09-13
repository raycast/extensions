import { getIntegration, updateIntegration } from "./client";
import { asJson } from "./format";
import type { ConfirmationDetails } from "./ai-tools";

export interface IntegrationMetadataInput {
  integration: string;
  name?: string;
  description?: string;
}

function metadataUpdate(input: IntegrationMetadataInput) {
  const slug = typeof input.integration === "string" ? input.integration.trim() : "";
  if (!slug || slug === "." || slug === ".." || /[/\\?#]/.test(slug))
    throw new Error("Use an exact integration slug returned by list-integrations.");
  const changes: { name?: string; description?: string } = {};
  for (const field of ["name", "description"] as const) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== "string") throw new Error(`${field} must be text.`);
    const value = input[field].trim();
    if (field === "name" && !value) throw new Error("Enter an integration name.");
    changes[field] = value;
  }
  if (!Object.keys(changes).length) throw new Error("Provide a name or description to update.");
  return { slug, changes };
}

export async function integrationMetadataConfirmation(input: IntegrationMetadataInput): Promise<ConfirmationDetails> {
  const { slug, changes } = metadataUpdate(input);
  const current = await getIntegration(slug);
  if (current.slug !== slug) throw new Error("Executor returned a different integration. Refresh list-integrations.");
  return {
    message: "Update this integration's display details? Omitted fields and tool addresses stay unchanged.",
    info: [
      { name: "Integration", value: current.name },
      { name: "Changes", value: asJson(changes) },
    ],
  };
}

/** Shared by the native editor and AI; sends only the two editable metadata fields. */
export async function saveIntegrationMetadata(input: IntegrationMetadataInput) {
  const { slug, changes } = metadataUpdate(input);
  const integration = await updateIntegration(slug, changes);
  return { integration };
}
