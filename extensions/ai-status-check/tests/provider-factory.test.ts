import assert from "node:assert/strict";
import test from "node:test";
import { createProvider } from "../src/providers/factories/provider";
import type { ProviderAdapterConfig } from "../src/providers/types";

interface ExampleConfig extends ProviderAdapterConfig {
  source: string;
}

test("creates a provider with one normalized URL and passes adapter-specific options", () => {
  let received: ExampleConfig | undefined;
  const provider = createProvider(
    {
      id: "example",
      name: "Example",
      aliases: [],
      category: "model-providers",
      preferenceKey: "showExample",
      icon: "provider-icons/example.png",
      statusPageUrl: "https://status.example.com",
    },
    (config: ExampleConfig) => {
      received = config;
      return {
        async fetch() {
          throw new Error("not used");
        },
      };
    },
    { source: "framework" },
  );

  assert.equal(provider.statusPageUrl, "https://status.example.com/");
  assert.deepEqual(received, {
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    source: "framework",
  });
});
