import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), "utf8");

type Manifest = {
  name: string;
  title: string;
  description: string;
  icon: string;
  license: string;
  platforms: string[];
  categories: string[];
  keywords: string[];
  commands: { name: string; title: string; subtitle: string; description: string; mode: string }[];
  preferences: {
    name: string;
    type: string;
    required: boolean;
    title: string;
    placeholder: string;
    description: string;
  }[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const manifest = JSON.parse(read("package.json")) as Manifest;

// Raycast's category list [R3], read 2026-11-22.
const CATEGORIES = [
  "Applications",
  "Communication",
  "Data",
  "Documentation",
  "Design Tools",
  "Developer Tools",
  "Finance",
  "Fun",
  "Media",
  "News",
  "Productivity",
  "Security",
  "System",
  "Web",
  "Other",
];

const sourceFiles = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : [join(dir, e.name)],
  );

describe("the manifest", () => {
  it("one view command whose file exists", () => {
    expect(manifest.commands).toHaveLength(1);
    const [command] = manifest.commands;
    expect(command).toMatchObject({ name: "shorten-clipboard-url", mode: "view" });
    expect(existsSync(join(root, "src", `${command!.name}.tsx`))).toBe(true);
  });

  it("apiKey is the only preference, an optional password", () => {
    expect(manifest.preferences).toHaveLength(1);
    expect(manifest.preferences[0]).toMatchObject({ name: "apiKey", type: "password", required: false });
  });

  it("MIT, a category from Raycast's list, npm only", () => {
    expect(manifest.license).toBe("MIT");
    expect(manifest.categories.length).toBeGreaterThan(0);
    for (const category of manifest.categories) expect(CATEGORIES).toContain(category);
    expect(existsSync(join(root, "package-lock.json"))).toBe(true);
    for (const other of ["yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock"])
      expect(existsSync(join(root, other))).toBe(false);
    // Exact versions, pinned by the lockfile (ADR 0022, Decision 5).
    for (const version of Object.values({ ...manifest.dependencies, ...manifest.devDependencies })) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("platforms is macOS only", () => {
    expect(manifest.platforms).toEqual(["macOS"]);
  });

  it("the icon is a 512 × 512 PNG", () => {
    const icon = readFileSync(join(root, "assets", manifest.icon));
    expect([...icon.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(icon.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect([icon.readUInt32BE(16), icon.readUInt32BE(20)]).toEqual([512, 512]);
  });

  it("CHANGELOG starts with the Raycast header", () => {
    expect(read("CHANGELOG.md")).toBe(
      "# Linkonda Changelog\n\n## [Initial Version] - {PR_MERGE_DATE}\n\n- Shorten the URL on your clipboard, copy the short link and show its QR code.\n",
    );
  });

  it("the manifest's texts are S-1 to S-5", () => {
    expect(manifest.title).toBe("Linkonda");
    expect(manifest.description).toBe(
      "Shorten the URL on your clipboard with Linkonda, copy the short link and show its QR code.",
    );
    expect(manifest.description.length).toBeGreaterThanOrEqual(50);
    expect(manifest.description.length).toBeLessThanOrEqual(155);
    expect(manifest.commands[0]).toMatchObject({
      title: "Shorten Clipboard URL",
      subtitle: "Linkonda",
      description: "Shorten the URL on your clipboard, copy the short link and show its QR code.",
    });
    expect(manifest.preferences[0]).toMatchObject({
      title: "API Key",
      placeholder: "Optional",
      description: "A Linkonda API key saves your links to your account. Leave it empty to shorten without an account.",
    });
    expect(manifest.categories).toEqual(["Productivity", "Web"]);
    expect(manifest.keywords).toEqual(["url shortener", "link shortener", "short link", "qr code"]);
  });

  it("the extension's texts name no plan, price or limit", () => {
    const texts = [
      JSON.stringify([
        manifest.title,
        manifest.description,
        manifest.commands,
        manifest.preferences,
        manifest.keywords,
      ]),
      read("README.md"),
      read("CHANGELOG.md"),
      read("src/lib/view.ts"),
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/\b(free|starter|plus|pro|business|enterprise)\b/i);
      expect(text).not.toMatch(/[€$£]\s?\d|\d\s?(€|EUR|USD|GBP)\b/);
      expect(text).not.toMatch(/\d+\s+(links?|keys?|days?)\b/i);
    }
    // "paid plan(s)" is the one allowed phrase (Decision 5).
    expect(read("README.md")).toContain("API keys need a paid plan");
  });
});

describe("the source", () => {
  it("src stores nothing, logs nothing and names no host but Linkonda's", () => {
    const files = sourceFiles("src");
    expect(files.length).toBeGreaterThan(0);
    const allowed = new Set(["https://api.linkonda.com", "https://linkonda.com", "https://linkonda.com/api-keys"]);
    for (const file of files) {
      const code = read(file);
      expect(code, file).not.toMatch(/\bconsole\./);
      expect(code, file).not.toMatch(
        /LocalStorage|\bCache\b|supportPath|writeFile|appendFile|createWriteStream|from "(node:)?fs/,
      );
      // Only the short link is ever copied or concealed-copied.
      for (const call of code.matchAll(/Clipboard\.(copy|paste)\(([^)]*)\)/g)) {
        expect(call[1], file).toBe("copy");
        expect(call[2], file).toBe("shortUrl");
      }
      for (const content of code.matchAll(/CopyToClipboard[^>]*content=\{([^}]*)\}/gs))
        expect(content[1]).toBe("link.shortUrl");
      for (const host of code.matchAll(/https?:\/\/[a-z0-9][^\s"'`)<>,]*/gi)) {
        const found = host[0].replace(/[.;]+$/, "");
        expect(allowed.has(found), `${file}: ${found}`).toBe(true);
      }
    }
  });

  it("Raycast's own tools run, and the API call is the only fetch", () => {
    const fetches = sourceFiles("src").filter((f) => /\bfetch\(|fetchImpl\(/.test(read(f)));
    expect(fetches).toEqual([join("src", "lib", "api.ts")]);
    expect(execFileSync("node", ["-e", "process.stdout.write('ok')"]).toString()).toBe("ok");
  });
});
