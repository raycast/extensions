import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface ManifestPreference {
  name: string;
  required?: boolean;
  default?: string;
}

describe("extension preferences", () => {
  it("uses Stable by default without requiring first-run confirmation", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      preferences: ManifestPreference[];
    };
    const applicationChannel = manifest.preferences.find(
      (preference) => preference.name === "applicationChannel",
    );

    expect(applicationChannel).toMatchObject({
      required: false,
      default: "stable",
    });
  });
});
