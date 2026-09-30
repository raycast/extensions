import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const extensionRoot = process.cwd();

describe("OAuth-only extension", () => {
  it("gives every command its own local icon", () => {
    const manifest = JSON.parse(
      readFileSync(join(extensionRoot, "package.json"), "utf8"),
    ) as { commands: Array<{ icon?: string }> };
    const icons = manifest.commands.map((command) => command.icon);
    expect(icons.every((icon) => typeof icon === "string")).toBe(true);
    expect(new Set(icons).size).toBe(manifest.commands.length);
    for (const icon of icons) {
      expect(existsSync(join(extensionRoot, "assets", icon as string))).toBe(
        true,
      );
    }
  });

  it("has no API-key preference", () => {
    const manifest = JSON.parse(
      readFileSync(join(extensionRoot, "package.json"), "utf8"),
    ) as { preferences?: Array<{ name: string }> };
    expect(manifest.preferences?.map((item) => item.name)).not.toContain(
      "apiKey",
    );
  });

  it("exposes one account surface instead of duplicate account and wallet commands", () => {
    const manifest = JSON.parse(
      readFileSync(join(extensionRoot, "package.json"), "utf8"),
    ) as { commands: Array<{ name: string }> };
    const commandNames = manifest.commands.map((command) => command.name);
    expect(commandNames).toContain("account");
    expect(commandNames).not.toContain("wallet");
  });

  it("stores model choices inside the extension instead of static preferences", () => {
    const manifest = JSON.parse(
      readFileSync(join(extensionRoot, "package.json"), "utf8"),
    ) as { preferences?: Array<{ name: string }> };
    const preferenceNames =
      manifest.preferences?.map((item) => item.name) ?? [];
    expect(preferenceNames).not.toContain("defaultModel");
  });

  it("has no legacy API-key client implementation", () => {
    const client = readFileSync(
      join(extensionRoot, "src/lib/client.ts"),
      "utf8",
    );
    expect(client).not.toMatch(/apiKey|getClientWithUA|getClient\(/);
  });

  it("does not ship internal implementation plans or mockup instructions", () => {
    expect(
      existsSync(
        join(extensionRoot, "docs/plans/2026-07-12-oauth-product-refactor.md"),
      ),
    ).toBe(false);
    expect(existsSync(join(extensionRoot, "metadata/SCREENSHOTS.md"))).toBe(
      false,
    );
    const readme = readFileSync(join(extensionRoot, "README.md"), "utf8");
    expect(readme).not.toMatch(/apps\/raycast|design mockup|Wallet Status/);
    const changelog = readFileSync(join(extensionRoot, "CHANGELOG.md"), "utf8");
    expect(changelog).not.toMatch(
      /API Key|API-key|Wallet Status|Recent Logs|Channel Health/,
    );
  });

  it("uses user-facing command names instead of backend terminology", () => {
    const manifest = JSON.parse(
      readFileSync(join(extensionRoot, "package.json"), "utf8"),
    ) as { commands: Array<{ name: string; title: string }> };
    const titles = Object.fromEntries(
      manifest.commands.map((command) => [command.name, command.title]),
    );
    expect(titles.account).toBe("Account & Usage");
    expect(titles["recent-logs"]).toBe("Recent Requests");
    expect(titles["channel-health"]).toBe("Service Status");
  });
});
