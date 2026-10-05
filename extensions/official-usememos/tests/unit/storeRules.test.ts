import { describe, expect, it } from "vitest";
import {
  checkAssets,
  checkChangelog,
  checkDependencyHygiene,
  checkForbiddenApis,
  checkManifestMetadata,
  checkNaming,
  checkPackageLock,
  checkReadme,
  checkRootNavigationTitle,
  checkScreenshots,
  checkUsEnglish,
  partitionViolations,
  readPngSize,
  toTitleCase,
  type Command,
  type KnownGap,
  type Manifest,
} from "../../tools/store-check/rules";

const manifest = (overrides: Partial<Manifest> = {}): Manifest => ({
  name: "memos",
  title: "Memos",
  description: "Capture, find and manage your Memos notes without leaving Raycast.",
  author: "youscef",
  license: "MIT",
  icon: "usememos.png",
  platforms: ["macOS"],
  categories: ["Productivity"],
  commands: [],
  preferences: [],
  dependencies: { "@raycast/api": "^1.104.20" },
  ...overrides,
});

const command = (overrides: Partial<Command> = {}): Command => ({
  name: "search-memos",
  title: "Search Memos",
  description: "Search your memos and preview them rendered as Markdown",
  ...overrides,
});

describe("checkManifestMetadata", () => {
  it("accepts a compliant manifest", () => {
    expect(checkManifestMetadata(manifest())).toEqual([]);
  });

  it("rejects a license that is not MIT", () => {
    const violations = checkManifestMetadata(manifest({ license: "Apache-2.0" }));
    expect(violations.map((violation) => violation.check)).toEqual(["manifest.license"]);
  });

  it("rejects a missing author", () => {
    expect(checkManifestMetadata(manifest({ author: "" })).map((violation) => violation.check)).toEqual([
      "manifest.author",
    ]);
  });

  it("rejects a category outside Raycast's list", () => {
    const violations = checkManifestMetadata(manifest({ categories: ["productivity"] }));
    expect(violations[0]?.check).toBe("manifest.categories");
    expect(violations[0]?.message).toContain("Productivity");
  });

  it("rejects an empty categories array", () => {
    expect(checkManifestMetadata(manifest({ categories: [] })).map((v) => v.check)).toEqual(["manifest.categories"]);
  });

  it("rejects an empty platforms array", () => {
    expect(checkManifestMetadata(manifest({ platforms: [] })).map((v) => v.check)).toEqual(["manifest.platforms"]);
  });

  it("rejects a description made of two sentences", () => {
    const violations = checkManifestMetadata(
      manifest({ description: "Capture your notes. Find them again without leaving Raycast." }),
    );
    expect(violations.map((v) => v.check)).toEqual(["manifest.description"]);
  });
});

describe("toTitleCase", () => {
  it("capitalizes every significant word", () => {
    expect(toTitleCase("search memos")).toBe("Search Memos");
  });

  it("lower-cases short prepositions in the middle", () => {
    expect(toTitleCase("Save Clipboard As Memo")).toBe("Save Clipboard as Memo");
  });

  it("capitalizes a short word when it is last", () => {
    expect(toTitleCase("Sign in")).toBe("Sign In");
  });

  it("preserves canonically lower-case names", () => {
    expect(toTitleCase("macos shortcuts")).toBe("macOS Shortcuts");
  });
});

describe("checkNaming", () => {
  it("accepts compliant titles", () => {
    expect(checkNaming(manifest({ commands: [command()] }))).toEqual([]);
  });

  it("rejects a command title that is not title case", () => {
    const violations = checkNaming(manifest({ commands: [command({ title: "Search memos" })] }));
    expect(violations[0]?.check).toBe("naming.titleCase");
    expect(violations[0]?.message).toContain("Search Memos");
  });

  it("rejects an article in a command title", () => {
    const violations = checkNaming(manifest({ commands: [command({ title: "Search an Emoji" })] }));
    expect(violations.map((v) => v.check)).toContain("naming.article");
  });

  it("rejects a subtitle that repeats a word from its title", () => {
    const violations = checkNaming(
      manifest({ commands: [command({ title: "Search Memos", subtitle: "List Memos" })] }),
    );
    expect(violations.map((v) => v.check)).toContain("naming.subtitleDuplicatesTitle");
  });

  it("rejects a subtitle that reads as a description", () => {
    const violations = checkNaming(
      manifest({ commands: [command({ title: "Capture Memo", subtitle: "Quickly capture a note" })] }),
    );
    expect(violations.map((v) => v.check)).toContain("naming.subtitleReadsAsDescription");
  });

  it("accepts a subtitle that only names the service", () => {
    const violations = checkNaming(manifest({ commands: [command({ title: "Search Notes", subtitle: "Memos" })] }));
    expect(violations).toEqual([]);
  });

  it("rejects a preference title that is not title case", () => {
    const violations = checkNaming(
      manifest({ preferences: [{ name: "instanceUrl", title: "Instance url", type: "textfield" }] }),
    );
    expect(violations.map((v) => v.check)).toContain("naming.titleCase");
  });
});

const png = (width: number, height: number): Uint8Array => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
};

describe("readPngSize", () => {
  it("reads the IHDR dimensions", () => {
    expect(readPngSize(png(2000, 1250))).toEqual({ width: 2000, height: 1250 });
  });

  it("throws on a file that is not a PNG", () => {
    expect(() => readPngSize(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow("not a PNG");
  });
});

describe("checkScreenshots", () => {
  const shot = (name: string, width = 2000, height = 1250) => ({ name, bytes: png(width, height) });

  it("accepts three correctly sized screenshots", () => {
    expect(checkScreenshots([shot("1.png"), shot("2.png"), shot("3.png")])).toEqual([]);
  });

  it("rejects an empty metadata folder", () => {
    expect(checkScreenshots([]).map((v) => v.check)).toEqual(["screenshots.missing"]);
  });

  it("rejects more than six screenshots", () => {
    const shots = Array.from({ length: 7 }, (_, index) => shot(`${index}.png`));
    expect(checkScreenshots(shots).map((v) => v.check)).toContain("screenshots.tooMany");
  });

  it("rejects the wrong dimensions", () => {
    const violations = checkScreenshots([shot("1.png"), shot("2.png"), shot("3.png", 1600, 1000)]);
    expect(violations[0]?.check).toBe("screenshots.dimensions");
    expect(violations[0]?.message).toContain("2000x1250");
  });

  it("rejects a non-PNG file", () => {
    const violations = checkScreenshots([
      shot("1.png"),
      shot("2.png"),
      { name: "3.jpg", bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
    ]);
    expect(violations.map((v) => v.check)).toContain("screenshots.format");
  });
});

describe("checkChangelog", () => {
  it("accepts the Raycast format", () => {
    const source =
      "# Memos Changelog\n\n## [Added Search] - {PR_MERGE_DATE}\n\n- Add search\n\n## [Initial Version] - 2026-01-02\n\n- Ship it\n";
    expect(checkChangelog(source)).toEqual([]);
  });

  it("rejects a missing changelog", () => {
    expect(checkChangelog(undefined).map((v) => v.check)).toEqual(["changelog.missing"]);
  });

  it("rejects a heading without square brackets", () => {
    const violations = checkChangelog("# Memos Changelog\n\n## Added Search - {PR_MERGE_DATE}\n");
    expect(violations[0]?.check).toBe("changelog.headingFormat");
  });

  it("rejects a heading without the hyphen spacing", () => {
    const violations = checkChangelog("# Memos Changelog\n\n## [Added Search]-{PR_MERGE_DATE}\n");
    expect(violations[0]?.check).toBe("changelog.headingFormat");
  });

  it("rejects two unreleased entries", () => {
    const source = "# C\n\n## [One] - {PR_MERGE_DATE}\n\n## [Two] - {PR_MERGE_DATE}\n";
    expect(checkChangelog(source).map((v) => v.check)).toContain("changelog.multipleUnreleased");
  });

  it("rejects an unreleased entry that is not first", () => {
    const source = "# C\n\n## [One] - 2026-01-02\n\n## [Two] - {PR_MERGE_DATE}\n";
    expect(checkChangelog(source).map((v) => v.check)).toContain("changelog.unreleasedNotFirst");
  });
});

describe("checkReadme", () => {
  it("accepts media linked from the media folder", () => {
    expect(checkReadme("![Shot](./media/shot.png)")).toEqual([]);
  });

  it("rejects a missing readme", () => {
    expect(checkReadme(undefined).map((v) => v.check)).toEqual(["readme.missing"]);
  });

  it("rejects media linked from the assets folder", () => {
    const violations = checkReadme('<img src="./assets/icon.png" width="64">');
    expect(violations[0]?.check).toBe("readme.mediaInAssets");
    expect(violations[0]?.message).toContain("media/");
  });
});

describe("checkAssets", () => {
  it("accepts an assets folder holding only the icon", () => {
    const assets = [{ name: "usememos.png", bytes: png(512, 512) }];
    expect(checkAssets(manifest(), assets, [])).toEqual([]);
  });

  it("rejects an asset nothing references", () => {
    const assets = [
      { name: "usememos.png", bytes: png(512, 512) },
      { name: "leftover.png", bytes: png(64, 64) },
    ];
    const violations = checkAssets(manifest(), assets, []);
    expect(violations[0]?.check).toBe("assets.unused");
    expect(violations[0]?.subject).toBe("leftover.png");
  });

  it("accepts an asset referenced from source", () => {
    const assets = [
      { name: "usememos.png", bytes: png(512, 512) },
      { name: "empty.png", bytes: png(64, 64) },
    ];
    const sources = [{ path: "components/List.tsx", text: 'icon="empty.png"' }];
    expect(checkAssets(manifest(), assets, sources)).toEqual([]);
  });
});

describe("checkRootNavigationTitle", () => {
  const withSetup = manifest({ commands: [command({ name: "setup", title: "Setup Memos" })] });

  it("accepts a root component that leaves navigationTitle alone", () => {
    const sources = [
      { path: "setup.tsx", text: 'import { SetupGuide } from "./components/SetupGuide";\n<SetupGuide />' },
      { path: "components/SetupGuide.tsx", text: "<List isLoading={state.isLoading}>" },
    ];
    expect(checkRootNavigationTitle(withSetup, sources)).toEqual([]);
  });

  it("rejects navigationTitle in a component a command renders directly", () => {
    const sources = [
      { path: "setup.tsx", text: 'import { SetupGuide } from "./components/SetupGuide";\n<SetupGuide />' },
      { path: "components/SetupGuide.tsx", text: '<List navigationTitle="Setup Memos">' },
    ];
    const violations = checkRootNavigationTitle(withSetup, sources);
    expect(violations[0]?.check).toBe("code.rootNavigationTitle");
    expect(violations[0]?.subject).toBe("components/SetupGuide.tsx");
  });

  it("allows navigationTitle in a component no command renders directly", () => {
    const sources = [
      { path: "setup.tsx", text: 'import { SetupGuide } from "./components/SetupGuide";\n<SetupGuide />' },
      { path: "components/SetupGuide.tsx", text: "<List>" },
      { path: "components/MemoPreview.tsx", text: '<Detail navigationTitle="Preview" />' },
    ];
    expect(checkRootNavigationTitle(withSetup, sources)).toEqual([]);
  });
});

describe("checkDependencyHygiene", () => {
  it("accepts the current dependencies", () => {
    expect(checkDependencyHygiene(manifest())).toEqual([]);
  });

  it("rejects an analytics package", () => {
    const violations = checkDependencyHygiene(
      manifest({ dependencies: { "@raycast/api": "^1.0.0", "posthog-node": "^4.0.0" } }),
    );
    expect(violations[0]?.check).toBe("code.analytics");
    expect(violations[0]?.subject).toBe("posthog-node");
  });

  it("rejects a keychain package", () => {
    const violations = checkDependencyHygiene(manifest({ dependencies: { keytar: "^7.0.0" } }));
    expect(violations.map((v) => v.check)).toContain("code.keychain");
  });
});

describe("checkForbiddenApis", () => {
  it("accepts source with no keychain access", () => {
    expect(checkForbiddenApis([{ path: "api/client.ts", text: "await fetch(url)" }])).toEqual([]);
  });

  it("rejects a keychain call", () => {
    const sources = [{ path: "helpers/token.ts", text: 'execSync("security find-generic-password -s memos")' }];
    expect(checkForbiddenApis(sources).map((v) => v.check)).toEqual(["code.keychain"]);
  });
});

describe("checkUsEnglish", () => {
  it("accepts US spelling", () => {
    expect(checkUsEnglish([{ path: "README.md", text: "Customize the color behavior." }])).toEqual([]);
  });

  it("rejects British spelling", () => {
    const violations = checkUsEnglish([{ path: "README.md", text: "Customise the colour behaviour." }]);
    expect(violations.map((v) => v.subject)).toEqual(["README.md"]);
    expect(violations[0]?.message).toContain("customise");
  });
});

describe("partitionViolations", () => {
  const violation = { check: "screenshots.missing", subject: "metadata", message: "..." };
  const gap: KnownGap = {
    check: "screenshots.missing",
    subject: "metadata",
    reason: "Captured before submission",
    owner: "human",
  };

  it("moves a baselined violation out of the failing set", () => {
    const result = partitionViolations([violation], [gap]);
    expect(result.unexpected).toEqual([]);
    expect(result.known).toEqual([violation]);
    expect(result.resolved).toEqual([]);
  });

  it("keeps a violation that is not baselined", () => {
    const result = partitionViolations([violation], []);
    expect(result.unexpected).toEqual([violation]);
  });

  it("matches on subject as well as check", () => {
    const other = { ...violation, subject: "assets" };
    expect(partitionViolations([other], [gap]).unexpected).toEqual([other]);
  });

  it("reports a baselined gap that no longer happens", () => {
    expect(partitionViolations([], [gap]).resolved).toEqual([gap]);
  });
});

describe("checkPackageLock", () => {
  const lock = (dependencies: Record<string, string>) => JSON.stringify({ packages: { "": { dependencies } } });

  it("accepts a lockfile matching package.json", () => {
    expect(checkPackageLock(manifest(), lock({ "@raycast/api": "^1.104.20" }))).toEqual([]);
  });

  it("rejects a missing lockfile", () => {
    expect(checkPackageLock(manifest(), undefined).map((v) => v.check)).toEqual(["submission.packageLock"]);
  });

  it("rejects a lockfile that drifted from package.json", () => {
    const violations = checkPackageLock(manifest(), lock({ "@raycast/api": "^1.90.0" }));
    expect(violations[0]?.check).toBe("submission.packageLockStale");
  });
});
