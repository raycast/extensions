import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PROVIDERS } from "../src/providers/registry";

test("the catalog keeps exactly one provider in each file", async () => {
  const catalogDirectory = "src/providers/catalog";
  const catalogFiles = (await readdir(catalogDirectory)).filter((file) => file.endsWith(".ts")).sort();

  assert.equal(catalogFiles.length, PROVIDERS.length);
  await Promise.all(
    catalogFiles.map(async (file) => {
      const source = await readFile(`${catalogDirectory}/${file}`, "utf8");
      const providerExports = source.match(/export const \w+Provider\s*=/g) ?? [];
      assert.equal(providerExports.length, 1, `${file} must declare exactly one provider`);
      assert.match(source, /createProvider\(/, `${file} must use the shared provider factory`);
    }),
  );
});

test("every provider adapter extends the shared config and exposes a ProviderAdapter factory", async () => {
  const adapterDirectory = "src/providers/adapters";
  const adapterFiles = (await readdir(adapterDirectory)).filter((file) => file.endsWith(".ts")).sort();

  assert.ok(adapterFiles.length > 0);
  await Promise.all(
    adapterFiles.map(async (file) => {
      const source = await readFile(`${adapterDirectory}/${file}`, "utf8");
      assert.match(
        source,
        /export interface \w+AdapterConfig extends ProviderAdapterConfig\s*{/,
        `${file} must extend the shared adapter config`,
      );
      assert.match(
        source,
        /export function create\w+Adapter\(config: \w+AdapterConfig\): ProviderAdapter\s*{/,
        `${file} must export a ProviderAdapter factory`,
      );
      assert.doesNotMatch(source, /export function parse\w+\(/, `${file} must keep deterministic parsing in parsers/`);
    }),
  );
});
