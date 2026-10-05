import type { ConfirmationDetails } from "./ai-tools";
import { lookupCatalogItem } from "./catalog";
import {
  createIntegration,
  normalizeIntegrationSetupInput,
  previewIntegration,
  resolveIntegrationSetupDefaults,
  slugifyIntegrationName,
  type IntegrationSetupInput,
} from "./integration-setup";

export interface CreateIntegrationInput {
  kind: "mcp" | "openapi" | "graphql";
  domain?: string;
  catalogSlug?: string;
  endpoint?: string;
  name?: string;
  namespace?: string;
  description?: string;
  authentication?: "none" | "oauth2" | "apiKey";
  credentialLocation?: "header" | "query";
  credentialName?: string;
  credentialPrefix?: string;
}

export async function resolveAiIntegrationSetup(input: CreateIntegrationInput): Promise<IntegrationSetupInput> {
  if (input.domain && input.endpoint) throw new Error("Choose a catalog item or a custom endpoint, not both.");
  if (input.catalogSlug && !input.domain) throw new Error("A catalog slug requires its exact catalog domain.");
  const item = input.domain ? await lookupCatalogItem(input.domain.trim(), input.kind, input.catalogSlug) : undefined;
  const defaults = await resolveIntegrationSetupDefaults({ kind: input.kind, endpoint: input.endpoint }, item);
  const name = input.name?.trim() || defaults.name;
  return normalizeIntegrationSetupInput({
    ...defaults,
    name,
    slug: input.namespace ?? (input.name ? slugifyIntegrationName(name) : defaults.slug),
    description: input.description ?? defaults.description,
    ...(input.authentication
      ? {
          authentication: {
            kind: input.authentication,
            carrier: input.credentialLocation,
            name: input.credentialName,
            prefix: input.credentialPrefix,
          },
        }
      : {}),
  });
}

export async function createIntegrationConfirmation(input: CreateIntegrationInput): Promise<ConfirmationDetails> {
  const setup = await resolveAiIntegrationSetup(input);
  return {
    message: "Add this integration to the workspace? Connect an account afterward if authentication is required.",
    info: [
      { name: "Integration", value: setup.name },
      { name: "Type", value: setup.kind },
      { name: "Namespace", value: setup.slug },
      {
        name: "Source",
        value: /^https?:\/\//i.test(setup.endpoint) ? setup.endpoint : "Provided OpenAPI specification",
      },
      { name: "Authentication", value: setup.authentication?.kind ?? "From the service or specification" },
    ],
  };
}

export async function createAiIntegration(input: CreateIntegrationInput) {
  const setup = await resolveAiIntegrationSetup(input);
  const preview = await previewIntegration(setup);
  const integration = await createIntegration(setup, preview);
  return {
    status: "created",
    integration,
    instructions:
      "Integration creation is verified. Use list-integrations to inspect authentication methods, then add-connection if an account is needed. Do not repeat creation.",
  };
}
