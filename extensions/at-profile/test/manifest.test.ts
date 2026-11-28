import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { defaultApps } from "../src/utils/default-apps";

// Raycast arguments must be static, so Quick Open's app list is typed out in package.json. Fail when it drifts
// from the built-in apps.
describe("Quick Open app list", () => {
  it("matches default-apps.ts", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    const quickOpen = manifest.commands.find((command: { name: string }) => command.name === "quick-open");
    const options = quickOpen.arguments.find((argument: { name: string }) => argument.name === "app").data;

    const byValue = (a: { value: string }, b: { value: string }) => a.value.localeCompare(b.value);
    expect(
      options.map(({ title, value }: { title: string; value: string }) => ({ title, value })).sort(byValue),
    ).toEqual(defaultApps.map(({ name, value }) => ({ title: name, value })).sort(byValue));
  });
});
