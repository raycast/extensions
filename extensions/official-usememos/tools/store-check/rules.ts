export type Violation = { check: string; subject: string; message: string };

export type Asset = { name: string; bytes: Uint8Array };

export type Source = { path: string; text: string };

export type Command = {
  name: string;
  title: string;
  subtitle?: string;
  description: string;
};

export type Preference = {
  name: string;
  title: string;
  type: string;
  description?: string;
  placeholder?: string;
};

export type Manifest = {
  name: string;
  title: string;
  description: string;
  author: string;
  license?: string;
  icon: string;
  platforms?: string[];
  categories?: string[];
  commands: Command[];
  preferences?: Preference[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export const RAYCAST_CATEGORIES = [
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

const countSentences = (value: string) => value.split(/[.!?](?:\s|$)/).filter((part) => part.trim().length > 0).length;

export const checkManifestMetadata = (manifest: Manifest): Violation[] => {
  const violations: Violation[] = [];
  const add = (check: string, message: string) => violations.push({ check, subject: manifest.name, message });

  if (manifest.license !== "MIT") {
    add("manifest.license", `license is "${manifest.license ?? "missing"}". The store requires "MIT".`);
  }
  if (manifest.author.trim().length === 0) {
    add("manifest.author", "author is empty. It must be your Raycast account username.");
  }
  if (!manifest.platforms || manifest.platforms.length === 0) {
    add("manifest.platforms", "platforms is empty. List only the platforms the extension supports.");
  }

  const categories = manifest.categories ?? [];
  if (categories.length === 0) {
    add("manifest.categories", `categories is empty. Pick at least one of: ${RAYCAST_CATEGORIES.join(", ")}.`);
  }
  const unknown = categories.filter((category) => !RAYCAST_CATEGORIES.includes(category));
  if (unknown.length > 0) {
    add(
      "manifest.categories",
      `categories ${unknown.map((category) => `"${category}"`).join(", ")} are not Raycast categories (they are case-sensitive Title Case). Valid: ${RAYCAST_CATEGORIES.join(", ")}.`,
    );
  }

  if (countSentences(manifest.description) !== 1) {
    add("manifest.description", `description should be one sentence: "${manifest.description}"`);
  }

  return violations;
};

const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "so",
  "yet",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "off",
  "on",
  "onto",
  "out",
  "over",
  "per",
  "to",
  "up",
  "via",
  "with",
]);

const FIXED_CASE_WORDS = ["iOS", "macOS", "iPadOS", "npm", "iPhone", "iPad", "GitHub", "Markdown", "URL", "API", "ID"];

const ARTICLES = new Set(["a", "an", "the"]);

const SUBTITLE_STOPWORDS = new Set(["a", "an", "the", "to", "in", "as", "of", "for", "and", "or", "your", "new", "my"]);

export const toTitleCase = (value: string): string =>
  value
    .split(" ")
    .map((word, index, words) => {
      const fixed = FIXED_CASE_WORDS.find((candidate) => candidate.toLowerCase() === word.toLowerCase());
      if (fixed) return fixed;
      const isEdge = index === 0 || index === words.length - 1;
      if (!isEdge && LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

const contentWords = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !SUBTITLE_STOPWORDS.has(word));

const checkSubtitle = (command: Command): Violation[] => {
  const subtitle = command.subtitle;
  if (!subtitle) return [];

  const violations: Violation[] = [];
  const titleWords = contentWords(command.title);
  const shared = contentWords(subtitle).filter((word) => titleWords.includes(word));

  if (shared.length > 0) {
    violations.push({
      check: "naming.subtitleDuplicatesTitle",
      subject: command.name,
      message: `subtitle "${subtitle}" repeats ${shared.map((word) => `"${word}"`).join(", ")} from the title "${command.title}". Delete the subtitle rather than rewording it.`,
    });
  }

  const readsAsDescription =
    subtitle.trim().toLowerCase() === command.description.trim().toLowerCase() ||
    subtitle.trim().split(/\s+/).length > 4 ||
    /[.!?]$/.test(subtitle.trim()) ||
    /^(quickly|easily|simply|instantly)\b/i.test(subtitle.trim());

  if (readsAsDescription) {
    violations.push({
      check: "naming.subtitleReadsAsDescription",
      subject: command.name,
      message: `subtitle "${subtitle}" reads as a description. A subtitle adds context, usually the service name.`,
    });
  }

  return violations;
};

export const checkNaming = (manifest: Manifest): Violation[] => {
  const titled: { subject: string; label: string; title: string }[] = [
    { subject: manifest.name, label: "extension title", title: manifest.title },
    ...manifest.commands.map((command) => ({
      subject: command.name,
      label: "command title",
      title: command.title,
    })),
    ...(manifest.preferences ?? []).map((preference) => ({
      subject: preference.name,
      label: "preference title",
      title: preference.title,
    })),
  ];

  const violations: Violation[] = [];

  for (const { subject, label, title } of titled) {
    const expected = toTitleCase(title);
    if (expected !== title) {
      violations.push({
        check: "naming.titleCase",
        subject,
        message: `${label} "${title}" is not Apple Style title case. Expected "${expected}".`,
      });
    }
  }

  for (const command of manifest.commands) {
    const articles = command.title.split(" ").filter((word) => ARTICLES.has(word.toLowerCase()));
    if (articles.length > 0) {
      violations.push({
        check: "naming.article",
        subject: command.name,
        message: `command title "${command.title}" contains the article "${articles[0]}". Command titles drop articles.`,
      });
    }
    violations.push(...checkSubtitle(command));
  }

  return violations;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const readPngSize = (bytes: Uint8Array): { width: number; height: number } => {
  if (bytes.length < 24 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) {
    throw new Error("File is not a PNG");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const SCREENSHOT_WIDTH = 2000;
const SCREENSHOT_HEIGHT = 1250;

export const checkScreenshots = (screenshots: Asset[]): Violation[] => {
  if (screenshots.length === 0) {
    return [
      {
        check: "screenshots.missing",
        subject: "metadata",
        message: `metadata/ has no screenshots. Add three to six ${SCREENSHOT_WIDTH}x${SCREENSHOT_HEIGHT} PNGs with Raycast's Window Capture.`,
      },
    ];
  }

  const violations: Violation[] = [];

  if (screenshots.length < 3) {
    violations.push({
      check: "screenshots.tooFew",
      subject: "metadata",
      message: `metadata/ has ${screenshots.length} screenshot(s). Raycast recommends at least three.`,
    });
  }
  if (screenshots.length > 6) {
    violations.push({
      check: "screenshots.tooMany",
      subject: "metadata",
      message: `metadata/ has ${screenshots.length} screenshots. The maximum is six.`,
    });
  }

  for (const screenshot of screenshots) {
    try {
      const { width, height } = readPngSize(screenshot.bytes);
      if (width !== SCREENSHOT_WIDTH || height !== SCREENSHOT_HEIGHT) {
        violations.push({
          check: "screenshots.dimensions",
          subject: screenshot.name,
          message: `is ${width}x${height}. Store screenshots are ${SCREENSHOT_WIDTH}x${SCREENSHOT_HEIGHT} (16:10).`,
        });
      }
    } catch {
      violations.push({
        check: "screenshots.format",
        subject: screenshot.name,
        message: "is not a PNG. Store screenshots must be PNG.",
      });
    }
  }

  return violations;
};

const CHANGELOG_HEADING = /^## \[[^\]]+\] - (\{PR_MERGE_DATE\}|\d{4}-\d{2}-\d{2})$/;

export const checkChangelog = (source: string | undefined): Violation[] => {
  if (source === undefined) {
    return [
      {
        check: "changelog.missing",
        subject: "CHANGELOG.md",
        message: "is missing. Raycast renders it as the extension's version history.",
      },
    ];
  }

  const violations: Violation[] = [];
  const headings = source.split("\n").filter((line) => line.startsWith("## "));

  if (headings.length === 0) {
    violations.push({
      check: "changelog.headingFormat",
      subject: "CHANGELOG.md",
      message: "has no entries. Each entry is `## [Title] - {PR_MERGE_DATE}`.",
    });
  }

  for (const heading of headings.filter((heading) => !CHANGELOG_HEADING.test(heading.trimEnd()))) {
    violations.push({
      check: "changelog.headingFormat",
      subject: heading.trim(),
      message: "does not match `## [Title] - {PR_MERGE_DATE}` (square brackets, spaces either side of the hyphen).",
    });
  }

  const unreleased = headings.filter((heading) => heading.includes("{PR_MERGE_DATE}"));
  if (unreleased.length > 1) {
    violations.push({
      check: "changelog.multipleUnreleased",
      subject: "CHANGELOG.md",
      message: `has ${unreleased.length} {PR_MERGE_DATE} entries. Only the top entry is unreleased.`,
    });
  }
  if (unreleased.length === 1 && headings[0] !== unreleased[0]) {
    violations.push({
      check: "changelog.unreleasedNotFirst",
      subject: "CHANGELOG.md",
      message: "puts the {PR_MERGE_DATE} entry below a dated one. Newest first.",
    });
  }

  return violations;
};

export const checkReadme = (readme: string | undefined): Violation[] => {
  if (readme === undefined) {
    return [
      {
        check: "readme.missing",
        subject: "README.md",
        message: "is missing. The extension needs an access token, so setup instructions are required.",
      },
    ];
  }

  return /["(]\.?\/?assets\//.test(readme)
    ? [
        {
          check: "readme.mediaInAssets",
          subject: "README.md",
          message:
            "links media from assets/. README media belongs in a top-level media/ folder; assets/ is bundled into the extension.",
        },
      ]
    : [];
};

export const checkAssets = (manifest: Manifest, assets: Asset[], sources: Source[]): Violation[] => {
  const haystack = [JSON.stringify(manifest), ...sources.map((source) => source.text)].join("\n");
  return assets
    .filter((asset) => !haystack.includes(asset.name))
    .map((asset) => ({
      check: "assets.unused",
      subject: asset.name,
      message: "is in assets/ but nothing references it. Remove unused assets before submitting.",
    }));
};

export const checkRootNavigationTitle = (manifest: Manifest, sources: Source[]): Violation[] => {
  const byPath = new Map(sources.map((source) => [source.path, source]));
  const rootPaths = new Set<string>();

  for (const command of manifest.commands) {
    const entry = byPath.get(`${command.name}.tsx`) ?? byPath.get(`${command.name}.ts`);
    if (!entry) continue;
    rootPaths.add(entry.path);
    for (const match of entry.text.matchAll(/from\s+"\.\/((?:components|hooks)\/[A-Za-z0-9_-]+)"/g)) {
      const imported = match[1];
      if (imported === undefined) continue;
      const resolved = byPath.get(`${imported}.tsx`) ?? byPath.get(`${imported}.ts`);
      if (resolved) rootPaths.add(resolved.path);
    }
  }

  return [...rootPaths]
    .filter((path) => byPath.get(path)?.text.includes("navigationTitle") ?? false)
    .map((path) => ({
      check: "code.rootNavigationTitle",
      subject: path,
      message:
        "sets navigationTitle on a root command view. Raycast sets it from the command name; use it on nested screens only.",
    }));
};

const ANALYTICS_PACKAGES = [
  "posthog",
  "mixpanel",
  "amplitude",
  "@segment/",
  "analytics-node",
  "@sentry/",
  "plausible",
  "umami",
  "matomo",
  "firebase",
  "google-analytics",
];

const KEYCHAIN_PACKAGES = ["keytar", "node-keytar", "keychain"];

export const checkDependencyHygiene = (manifest: Manifest): Violation[] => {
  const packages = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  return packages.flatMap((name) => {
    if (ANALYTICS_PACKAGES.some((forbidden) => name.includes(forbidden))) {
      return [
        {
          check: "code.analytics",
          subject: name,
          message: "looks like external analytics. Raycast does not allow analytics in extensions.",
        },
      ];
    }
    if (KEYCHAIN_PACKAGES.some((forbidden) => name === forbidden || name.endsWith(`/${forbidden}`))) {
      return [
        {
          check: "code.keychain",
          subject: name,
          message: "reaches the Keychain. Extensions requesting Keychain access are rejected.",
        },
      ];
    }
    return [];
  });
};

const KEYCHAIN_PATTERNS = [/security\s+find-generic-password/, /security\s+add-generic-password/, /\bkeytar\b/];

export const checkForbiddenApis = (sources: Source[]): Violation[] =>
  sources
    .filter((source) => KEYCHAIN_PATTERNS.some((pattern) => pattern.test(source.text)))
    .map((source) => ({
      check: "code.keychain",
      subject: source.path,
      message: "accesses the Keychain. Extensions requesting Keychain access are rejected.",
    }));

const BRITISH_SPELLINGS = [
  "colour",
  "behaviour",
  "favourite",
  "organise",
  "organisation",
  "customise",
  "personalise",
  "initialise",
  "analyse",
  "centre",
  "licence",
  "whilst",
  "cancelled",
  "travelling",
  "labelled",
];

export const checkUsEnglish = (documents: Source[]): Violation[] =>
  documents.flatMap((document) => {
    const found = BRITISH_SPELLINGS.filter((word) => new RegExp(`\\b${word}`, "i").test(document.text));
    return found.length === 0
      ? []
      : [
          {
            check: "code.usEnglish",
            subject: document.path,
            message: `uses British spelling: ${found.join(", ")}. Raycast requires US English.`,
          },
        ];
  });

export type KnownGap = { check: string; subject: string; reason: string; owner: string };

const key = (item: { check: string; subject: string }) => `${item.check}::${item.subject}`;

export const partitionViolations = (violations: Violation[], gaps: KnownGap[]) => {
  const gapKeys = new Set(gaps.map(key));
  const violationKeys = new Set(violations.map(key));
  return {
    unexpected: violations.filter((violation) => !gapKeys.has(key(violation))),
    known: violations.filter((violation) => gapKeys.has(key(violation))),
    resolved: gaps.filter((gap) => !violationKeys.has(key(gap))),
  };
};

export const checkPackageLock = (manifest: Manifest, lock: string | undefined): Violation[] => {
  if (lock === undefined) {
    return [
      {
        check: "submission.packageLock",
        subject: "package-lock.json",
        message:
          "is missing. Raycast's CI builds with npm: run `pnpm lockfile` before the store PR.",
      },
    ];
  }

  const locked = (JSON.parse(lock) as { packages?: Record<string, { dependencies?: Record<string, string> }> })
    .packages?.[""]?.dependencies;

  return JSON.stringify(locked ?? {}) === JSON.stringify(manifest.dependencies ?? {})
    ? []
    : [
        {
          check: "submission.packageLockStale",
          subject: "package-lock.json",
          message: "does not match the dependencies in package.json. Re-run `pnpm lockfile`.",
        },
      ];
};
