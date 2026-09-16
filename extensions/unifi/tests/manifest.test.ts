import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../package.json";

const help = readFileSync(new URL("../help.md", import.meta.url), "utf8");

describe("first-run preferences", () => {
  it("requires a console address and API key without pre-filling either secret or host", () => {
    const preferences = new Map(manifest.preferences.map((preference) => [preference.name, preference]));
    const controller = preferences.get("controllerUrl");
    const apiKey = preferences.get("apiKey");

    expect(controller).toMatchObject({ required: true, type: "textfield" });
    expect(controller).not.toHaveProperty("default");
    expect(apiKey).toMatchObject({ required: true, type: "password" });
    expect(apiKey).not.toHaveProperty("default");
  });

  it("keeps the background menu-bar command opt-in", () => {
    const command = manifest.commands.find(({ name }) => name === "unifi-health-menu");

    expect(command).toMatchObject({ disabledByDefault: true, mode: "menu-bar" });
  });

  it("does not expose an insecure TLS bypass or bundle a fetch polyfill", () => {
    expect(manifest.preferences.some(({ name }) => name === "verifyTlsCertificates")).toBe(false);
    expect(manifest.dependencies).not.toHaveProperty("node-fetch");
    expect(manifest.devDependencies).not.toHaveProperty("@types/node-fetch");
  });

  it("does not direct users to bypass certificate verification", () => {
    expect(help).toContain("always validates the console certificate");
    expect(help).not.toContain("leave certificate verification disabled");
  });
});
