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

  it("keeps self-signed certificate support explicit and disabled by default", () => {
    const preference = manifest.preferences.find(({ name }) => name === "allowSelfSignedCertificate");

    expect(preference).toMatchObject({ default: false, required: false, type: "checkbox" });
    expect(preference?.description).toContain("Local Console only");
    expect(preference?.label).toContain("not recommended");
    expect(manifest.dependencies).toHaveProperty("node-fetch");
  });

  it("warns users before they allow a self-signed console certificate", () => {
    expect(help).toContain("validates the console certificate by default");
    expect(help).toContain("Enable it only for a console you trust on a local network");
    expect(help).toContain("Cloud requests always validate certificates");
  });

  it("does not expose a removed live-stats polling preference", () => {
    const command = manifest.commands.find(({ name }) => name === "view-devices");

    expect(command).not.toHaveProperty("preferences");
  });

  it("builds before tests and lint so clean checkouts have generated Raycast types", () => {
    expect(manifest.scripts.check).toBe("npm run build && npm test && npm run lint");
  });
});
