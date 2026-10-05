import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BEAUTIFUL_MERMAID_THEME_KEYS } from "../../renderers/beautiful-mermaid-metadata";

describe("beautiful theme preferences", () => {
  it("exposes every bundled beautiful-mermaid theme in package.json", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as {
      preferences: Array<{ name?: string; data?: Array<{ value: string }> }>;
    };

    const preference = packageJson.preferences.find((item) => item.name === "beautifulTheme");

    expect(preference?.data?.map((item) => item.value)).toEqual(BEAUTIFUL_MERMAID_THEME_KEYS);
  });
});
