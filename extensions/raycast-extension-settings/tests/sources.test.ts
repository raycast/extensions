import { chmodSync, mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  failureFromError,
  JUMP_DEADLINE_MS,
  JUMP_SCRIPT,
  JUMP_TIMEOUT_MS,
  parseJumpOutput,
  reasonFor,
} from "../src/jump";
import {
  builtInIcon,
  indexIcons,
  loadBuiltIns,
  mergeRows,
  parseBuiltIns,
  RAYCAST_APP,
  readInstalled,
  rowKey,
  sharedTitles,
  TextCache,
} from "../src/sources";

describe("parseBuiltIns", () => {
  it("reads built-in titles and drops the hidden ones", () => {
    const bundle =
      "x=$v({key:`clipboard-history`,title:`Clipboard History`,description:`a`})" +
      "y=$v({key:`raycast-debug`,title:`Debug`,description:`b`})" +
      "z=Q({key:`window-management`,title:`Window Management`,description:`c`})";
    expect(parseBuiltIns(bundle).map((r) => r.title)).toEqual(["Clipboard History", "Window Management"]);
  });
});

describe("built-in icons", () => {
  const icons = indexIcons([
    "extension-browser-Czc4a0B0.png",
    "extension-browser_large-ZSoY-xhC.png", // hash holding a dash
    "extension-calendar_large-6WCzGo_w.png", // hash holding an underscore
    "extension-calendar-BPZWhGnf.png", // small variant listed after the large one
    "extension-applications-mac-BDInx8WQ.png",
    "command-ai_large-BeuoFu8S.png",
    "command-general-light_large-CPJ4oOT4.png",
    "command-general-dark_large-BxgUa5Ru.png",
    "extension-games-EV1S37BD.svg",
    "logger-Cb355GaF.js",
  ]);

  it("indexes PNG icons by name, preferring the large variant", () => {
    expect(icons.get("extension-browser")).toBe("extension-browser_large-ZSoY-xhC.png");
    expect(icons.get("extension-calendar")).toBe("extension-calendar_large-6WCzGo_w.png");
    expect(icons.has("extension-games")).toBe(false);
    expect(icons.size).toBe(6);
  });

  it("falls back from own icon to rename, command, wrapped app, then Raycast", () => {
    expect(builtInIcon("browser", icons, "/f")).toEqual({ source: "/f/extension-browser_large-ZSoY-xhC.png" });
    expect(builtInIcon("applications", icons, "/f")).toEqual({
      source: "/f/extension-applications-mac-BDInx8WQ.png",
    });
    expect(builtInIcon("ai", icons, "/f")).toEqual({ source: "/f/command-ai_large-BeuoFu8S.png" });
    expect(builtInIcon("raycast-settings", icons, "/f")).toEqual({
      source: {
        light: "/f/command-general-light_large-CPJ4oOT4.png",
        dark: "/f/command-general-dark_large-BxgUa5Ru.png",
      },
    });
    expect(builtInIcon("window-management", icons, "/f")).toEqual({ fileIcon: RAYCAST_APP });
  });
});

// Raycast V2 writes Store installs mode 0666; V1 leftovers it copied over keep 0644.
function writeStore(dir: string, uuid: string, manifest: object, mode: number) {
  mkdirSync(join(dir, uuid));
  writeFileSync(join(dir, uuid, "package.json"), JSON.stringify(manifest));
  chmodSync(join(dir, uuid, "package.json"), mode);
}

describe("readInstalled", () => {
  it("labels UUID folders Store and named folders Dev", () => {
    const dir = mkdtempSync(join(tmpdir(), "ext-"));
    writeStore(
      dir,
      "40ebc708-9640-4a8c-9f7e-2b5c1d3e4f50",
      { title: "Color Picker", name: "color-picker", owner: "thomas" },
      0o666,
    );
    mkdirSync(join(dir, "qmd-search"));
    writeFileSync(
      join(dir, "qmd-search", "package.json"),
      JSON.stringify({ title: "QMD Search", name: "qmd-search", author: "sample-author" }),
    );
    mkdirSync(join(dir, "broken"));
    writeFileSync(join(dir, "broken", "package.json"), "{not json");
    const rows = readInstalled(dir).map((r) => [r.title, r.kind, r.owner]);
    expect(readInstalled(dir).find((r) => r.title === "QMD Search")?.author).toBe("sample-author");
    expect(rows).toHaveLength(2);
    expect(rows).toContainEqual(["Color Picker", "store", "thomas"]);
    expect(rows).toContainEqual(["QMD Search", "dev", "sample-author"]);
  });

  it("skips Store folders V1 left behind", () => {
    const dir = mkdtempSync(join(tmpdir(), "ext-"));
    writeStore(dir, "82c92be8-822f-4923-a5bc-573830b674fb", { title: "Coffee", name: "coffee" }, 0o666);
    writeStore(dir, "bf23fe42-79b1-4c92-a096-5219a3878852", { title: "QMD", name: "qmd" }, 0o644);
    expect(readInstalled(dir).map((r) => r.title)).toEqual(["Coffee"]);
  });
});

describe("loadBuiltIns", () => {
  const mapCache = (): TextCache & { sets: number } => {
    const m = new Map<string, string>();
    return {
      sets: 0,
      get: (k) => m.get(k),
      set(k, v) {
        this.sets++;
        m.set(k, v);
      },
    };
  };

  it("parses once, then reuses the cache until Raycast changes", () => {
    const dir = mkdtempSync(join(tmpdir(), "bundle-"));
    const bundle = join(dir, "index.mjs");
    writeFileSync(bundle, "a=$v({key:`calendar`,title:`Calendar`,description:`x`})");
    const cache = mapCache();
    expect(loadBuiltIns(cache, "2.6.3", bundle).map((r) => r.title)).toEqual(["Calendar"]);
    writeFileSync(bundle, "a=$v({key:`notes`,title:`Notes`,description:`x`})");
    utimesSync(bundle, new Date(), new Date(Date.now() - 60_000)); // a Raycast update rewrites the bundle
    expect(loadBuiltIns(cache, "2.6.3", bundle).map((r) => r.title)).toEqual(["Notes"]);
    expect(cache.sets).toBe(2);
    expect(loadBuiltIns(cache, "2.6.3", bundle).map((r) => r.title)).toEqual(["Notes"]);
    expect(cache.sets).toBe(2);
    expect(loadBuiltIns(cache, "2.7.0", bundle).map((r) => r.title)).toEqual(["Notes"]);
    expect(cache.sets).toBe(3);
  });
});

describe("mergeRows", () => {
  it("drops a built-in an installed extension shadows, sorted", () => {
    const merged = mergeRows(
      [{ title: "Calendar", kind: "built-in" }],
      [
        { title: "calendar", kind: "store" },
        { title: "Bartender", kind: "store" },
      ],
    );
    expect(merged.map((r) => [r.title, r.kind])).toEqual([
      ["Bartender", "store"],
      ["calendar", "store"],
    ]);
  });

  it("keeps installed extensions that share a title, with distinct keys", () => {
    const merged = mergeRows(
      [],
      [
        { title: "GitHub", kind: "store", id: "a", owner: "raycast", name: "github" },
        { title: "GitHub", kind: "store", id: "b", owner: "raycast", name: "github" },
      ],
    );
    expect(merged).toHaveLength(2);
    expect(new Set(merged.map(rowKey)).size).toBe(2);
    expect([...sharedTitles(merged)]).toEqual(["github"]);
  });
});

describe("jump results", () => {
  it("maps script output and errors to reasons", () => {
    expect(parseJumpOutput("ok\n")).toEqual({ ok: true });
    const noResult = parseJumpOutput("no-result");
    expect(noResult.ok).toBe(false);
    if (!noResult.ok) expect(reasonFor("Nexus", noResult)).toBe("Raycast Settings has no extension named “Nexus”");
    const denied = failureFromError("System Events got an error: osascript is not allowed assistive access. (-25211)");
    expect(denied).toEqual({ ok: false, code: "no-accessibility" });
    expect(parseJumpOutput("ambiguous")).toEqual({ ok: false, code: "ambiguous" });
    expect(JUMP_SCRIPT).toContain(`Date.now() + ${JUMP_DEADLINE_MS}`);
    expect(JUMP_TIMEOUT_MS - JUMP_DEADLINE_MS).toBeGreaterThanOrEqual(5000);
    expect(parseJumpOutput("something odd")).toEqual({ ok: false, code: "unknown", detail: "something odd" });
  });
});
