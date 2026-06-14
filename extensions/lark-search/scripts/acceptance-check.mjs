import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

check("manifest command surface is stable", async () => {
  const manifest = JSON.parse(await read("package.json"));
  const commandNames = manifest.commands.map((command) => command.name);
  assert(
    commandNames.join(",") === "search-lark,refresh-hot-index,setup-hot-index",
    `Unexpected commands: ${commandNames.join(", ")}`,
  );
  assert(
    !commandNames.includes("sync-quicklinks"),
    "Quicklink export command must stay removed",
  );
});

check("preferences are ordered by user importance", async () => {
  const manifest = JSON.parse(await read("package.json"));
  const preferenceNames = manifest.preferences.map(
    (preference) => preference.name,
  );
  assert(
    preferenceNames.join(",") ===
      "appTarget,larkCliPath,larkCliIdentity,feishuCliIdentity,hotIndexDirectory,hotIndexLimit",
    `Unexpected preferences: ${preferenceNames.join(", ")}`,
  );

  const hotIndexDirectory = manifest.preferences.find(
    (preference) => preference.name === "hotIndexDirectory",
  );
  assert(
    hotIndexDirectory?.type === "directory",
    "Root Search Shortcut Folder must use Raycast directory picker",
  );
});

check("application targets are built in", async () => {
  const preferences = await read("src/lib/preferences.ts");
  assert(
    preferences.includes('DEFAULT_LARK_BUNDLE_ID = "com.larksuite.larkApp"'),
    "Lark bundle id must be built in",
  );
  assert(
    preferences.includes('DEFAULT_FEISHU_BUNDLE_ID = "com.electron.lark"'),
    "Feishu bundle id must be built in",
  );
  assert(
    preferences.includes("feishuCliIdentity"),
    "Feishu must have a separate lark-cli identity",
  );
});

check("background contact detail APIs are not used", async () => {
  const sourceFiles = [
    "src/lib/hot-index.ts",
    "src/refresh-hot-index.ts",
    "src/setup-hot-index.ts",
  ];
  const forbidden = ["get-user", "search-user --user-ids", "user_profiles"];

  for (const file of sourceFiles) {
    const content = await read(file);
    for (const token of forbidden) {
      assert(!content.includes(token), `${file} must not call ${token}`);
    }
  }
});

check("hot index only deletes generated scripts", async () => {
  const hotIndex = await read("src/lib/hot-index.ts");
  assert(
    hotIndex.includes("/^lark-hot-index-\\d+\\.sh$/.test(entry)"),
    "Hot index cleanup must only delete generated lark-hot-index scripts",
  );
});

check("dead detail markdown cache is removed", async () => {
  const files = [
    "src/lib/types.ts",
    "src/lib/lark-cli.ts",
    "src/lib/search-normalizer.ts",
    "src/search-lark.tsx",
  ];
  for (const file of files) {
    const content = await read(file);
    assert(
      !content.includes("detailMarkdown"),
      `${file} should not keep detailMarkdown`,
    );
  }
});

check("friendly JSON parse errors are used for lark-cli output", async () => {
  const larkCli = await read("src/lib/lark-cli.ts");
  const hotIndex = await read("src/lib/hot-index.ts");
  assert(
    larkCli.includes("parseJsonOrThrow<SearchResponse>"),
    "Search adapter should wrap JSON parse errors",
  );
  assert(
    hotIndex.includes("parseJsonOrThrow<{ ok?: boolean; data?: unknown }>"),
    "Hot index adapter should wrap JSON parse errors",
  );
});

const failures = [];
for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`ready - ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`error - ${name}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  process.exit(1);
}
