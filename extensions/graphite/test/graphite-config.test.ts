import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphiteConfigInvalidError, GraphiteConfigMissingError, readGraphiteConfig } from "../src/lib/graphite-config";

// Redirect the legacy fallback too, so even the missing-config case cannot read real credentials.
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, homedir: vi.fn() };
});

describe("readGraphiteConfig", () => {
  let directory: string;
  let originalConfigHome: string | undefined;

  beforeEach(async () => {
    originalConfigHome = process.env.XDG_CONFIG_HOME;
    directory = await mkdtemp(join(tmpdir(), "graphite-config-"));
    process.env.XDG_CONFIG_HOME = directory;
    vi.mocked(homedir).mockReturnValue(join(directory, "home"));
    await mkdir(join(directory, "home"));
    await mkdir(join(directory, "graphite"));
  });

  afterEach(async () => {
    if (originalConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalConfigHome;
    vi.mocked(homedir).mockReset();
    await rm(directory, { recursive: true, force: true });
  });

  async function writeConfig(raw: string): Promise<void> {
    await writeFile(join(directory, "graphite", "user_config"), raw);
  }

  it("reports missing config when neither temporary path has a file", async () => {
    await expect(readGraphiteConfig()).rejects.toBeInstanceOf(GraphiteConfigMissingError);
  });

  it("does not expose a fake token from malformed JSON", async () => {
    await writeConfig('{"authToken":"FAKE_TOKEN_123",');
    const result = readGraphiteConfig();
    await expect(result).rejects.toBeInstanceOf(GraphiteConfigInvalidError);
    await expect(result).rejects.toHaveProperty("message", expect.not.stringContaining("FAKE_TOKEN"));
  });

  it("rejects an invalid token shape", async () => {
    await writeConfig('{"authToken":5}');
    await expect(readGraphiteConfig()).rejects.toBeInstanceOf(GraphiteConfigInvalidError);
  });

  it("uses a top-level token and production URLs", async () => {
    await writeConfig(JSON.stringify({ authToken: "FAKE_TOKEN_123" }));
    await expect(readGraphiteConfig()).resolves.toEqual({
      authToken: "FAKE_TOKEN_123",
      apiUrl: "https://api.graphite.com/v1",
      appUrl: "https://app.graphite.com",
    });
  });

  it.each([
    {
      label: "host prefix",
      profile: { name: "default", hostPrefix: "staging" },
      apiUrl: "https://api.staging.graphite.com/v1",
      appUrl: "https://app.staging.graphite.com",
    },
    {
      label: "base hostname",
      profile: { name: "default", baseHostname: "graphite.acme.dev" },
      apiUrl: "https://api.graphite.acme.dev/v1",
      appUrl: "https://app.graphite.acme.dev",
    },
  ])("uses the default profile's $label", async ({ profile, apiUrl, appUrl }) => {
    await writeConfig(JSON.stringify({ authToken: "FAKE_TOKEN_123", alternativeProfiles: [profile] }));
    await expect(readGraphiteConfig()).resolves.toEqual({ authToken: "FAKE_TOKEN_123", apiUrl, appUrl });
  });
});
