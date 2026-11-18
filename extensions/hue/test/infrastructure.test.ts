import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "@raycast/api";
import { createHueClient } from "../src/lib/hueBridge";
import { startBridge } from "./fakeBridge";

const sourceFiles = readdirSync(new URL("../src", import.meta.url), { recursive: true, encoding: "utf8" })
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"));

describe("the @raycast/api stub", () => {
  const imported = new Set(
    sourceFiles.flatMap((source) =>
      [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@raycast\/api"/g)].flatMap(([, names]) =>
        names.split(",").map((name) => name.trim().replace(/^type\s+/, "")),
      ),
    ),
  );

  it.each([...imported].filter(Boolean))("exports %s", (name) => {
    expect((api as Record<string, unknown>)[name]).toBeDefined();
  });
});

describe("the commands", () => {
  it.each(["controlLights", "controlGroups", "setScene", "toggleAllLights"])("%s imports", async (command) => {
    const module = await import(`../src/${command}.tsx`).catch(() => import(`../src/${command}.ts`));
    expect(module.default).toBeTypeOf("function");
  });
});

describe("the fake bridge", () => {
  it("accepts a connection", async () => {
    const bridge = await startBridge();
    const hueClient = await createHueClient(bridge.config);
    expect(bridge.requests.map(({ method, path }) => `${method} ${path}`)).toEqual(["GET /clip/v2/resource/bridge"]);
    hueClient.close();
  });
});
