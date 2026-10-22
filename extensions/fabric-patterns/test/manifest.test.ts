import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OUTPUT_LABEL } from "../lib/output";
import { DEFAULT_FABRIC_PATH } from "../lib/paths";
import { stateFor } from "../lib/states";

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8")) as {
  name: string;
  title: string;
  platforms?: string[];
  scripts?: Record<string, string>;
  commands: { name: string; title: string; subtitle?: string; mode: string }[];
  preferences: { name: string; title: string; default?: string; data?: { title: string; value: string }[] }[];
};
const pref = (name: string) => pkg.preferences.find((p) => p.name === name)!;
const wrapperSh = readFileSync(join(import.meta.dir, "..", "assets", "fabric-bg.sh"), "utf8");

// The Store already has an extension named "fabric" (Fabric.so), so this one can't use the name.
describe("ISC-91: the Store identity", () => {
  test("named fabric-patterns, titled Fabric Patterns, macOS only", () => {
    expect({ name: pkg.name, title: pkg.title, platforms: pkg.platforms }).toEqual({
      name: "fabric-patterns",
      title: "Fabric Patterns",
      platforms: ["macOS"],
    });
  });

  // Root search shows a command's subtitle, not the extension title (manual test 2026-10-20: all read "Fabric").
  test("every command's subtitle is the extension title", () => {
    expect(pkg.commands.map((c) => c.subtitle)).toEqual(pkg.commands.map(() => pkg.title));
  });

  // The Store's flow is `npm run publish`, mapped to this as in Store extensions (raycast-ollama, probed).
  test("npm run publish runs Raycast's publish", () => {
    expect(pkg.scripts?.publish).toBe("npx @raycast/api@latest publish");
  });
});

describe("package.json and the code say the same thing", () => {
  test("Update Fabric Patterns is a no-view command backed by src/update-patterns.tsx", () => {
    expect(pkg.commands.find((c) => c.name === "update-patterns")).toMatchObject({
      title: "Update Fabric Patterns",
      mode: "no-view",
    });
    expect(readdirSync(join(import.meta.dir, "..", "src"))).toContain("update-patterns.tsx");
  });

  test("the When a Run Finishes dropdown uses OUTPUT_LABEL's words, value for value", () => {
    const data = pref("defaultOutput").data ?? [];
    expect(data.length).toBeGreaterThan(0);
    expect(Object.fromEntries(data.map((d) => [d.value, d.title]))).toEqual(OUTPUT_LABEL);
    expect(pref("defaultOutput").title).toBe("When a Run Finishes");
  });

  test("the fabric path default is the one the code falls back to", () => {
    expect(pref("fabricPath").default).toBe(DEFAULT_FABRIC_PATH);
    expect(DEFAULT_FABRIC_PATH).toBe("/opt/homebrew/bin/fabric-ai");
  });

  test("the Save Folder has a default, so background runs work out of the box", () => {
    expect(pref("saveFolder").default).toBe("~/Documents/Fabric");
  });

  // A lowercase, hyphenated or split "save folder" in any of these files, or either wrapper
  // message losing the name, fails this.
  test("package.json, src, lib and the wrapper name the Save Folder by its Preferences title", () => {
    const title = pref("saveFolder").title;
    expect(title).toBe("Save Folder");
    expect(wrapperSh).toContain(`Saved to your ${title}.`);
    expect(wrapperSh).toContain(`No free file name in the ${title}.`);
    const root = join(import.meta.dir, "..");
    const files = [
      "package.json",
      ...["src", "lib", "assets"].flatMap((d) =>
        readdirSync(join(root, d), { recursive: true })
          .map(String)
          .filter((f) => /\.(ts|tsx|sh)$/.test(f))
          .map((f) => join(d, f)),
      ),
    ];
    expect(files).toContain(join("assets", "fabric-bg.sh"));
    const wrong = files.flatMap((f) =>
      (readFileSync(join(root, f), "utf8").match(/save[\s-]+folder/gi) ?? [])
        .filter((m) => m !== title)
        .map((m) => `${f}: ${JSON.stringify(m)}`),
    );
    expect(wrong).toEqual([]);
  });

  test("every mention of the background-runs command uses its title", () => {
    const title = pkg.commands.find((c) => c.name === "background-runs")!.title;
    expect(title).toBe("Show Background Runs");
    expect(stateFor("youtube-background").description).toContain(title);
    expect(wrapperSh).toContain(title);
  });
});
