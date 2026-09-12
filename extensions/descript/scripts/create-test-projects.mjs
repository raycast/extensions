#!/usr/bin/env node
/**
 * Seed Descript with empty test projects (lorem ipsum titles) for Browse Projects.
 *
 * Uses POST /v1/jobs/import/project_media with only project_name — no media.
 * Projects appear in the list immediately; import jobs finish quickly with nothing to process.
 *
 * Usage:
 *   DESCRIPT_API_TOKEN=your_token npm run seed-test-projects -- --count 70 --delay 2000
 *   DESCRIPT_API_TOKEN=your_token npm run seed-test-projects -- 2 --dry-run
 *   DESCRIPT_API_TOKEN=your_token node scripts/create-test-projects.mjs --count 100
 *
 * Options:
 *   N or --count N  Number of projects (default: 100)
 *   --folder PATH   Folder path for new projects (default: "Raycast Test")
 *   --no-folder     Create at drive root (private, no team_access required)
 *   --team-access   edit|comment|view — required when using a folder (default: edit)
 *   --prefix TEXT   Title prefix (default: none; titles are lorem phrases + index)
 *   --delay MS      Pause between requests (default: 200)
 *   --dry-run       Print titles without calling the API
 */

const API_BASE = "https://descriptapi.com";

const LOREM_WORDS = [
  "Lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
];

function parseArgs(argv) {
  const opts = {
    count: 100,
    folder: "Raycast Test",
    teamAccess: "edit",
    prefix: "",
    delayMs: 200,
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    const countMatch = arg.match(/^--count=(.+)$/);
    if (countMatch) {
      opts.count = Number(countMatch[1]);
      continue;
    }
    if (arg === "--count" && argv[i + 1]) {
      opts.count = Number(argv[++i]);
      continue;
    }
    if (/^\d+$/.test(arg)) {
      opts.count = Number(arg);
      continue;
    }
    if (arg === "--folder" && argv[i + 1]) {
      opts.folder = argv[++i];
      continue;
    }
    if (arg === "--no-folder") {
      opts.folder = "";
      continue;
    }
    if (arg === "--team-access" && argv[i + 1]) {
      opts.teamAccess = argv[++i];
      continue;
    }
    if (arg === "--prefix" && argv[i + 1]) {
      opts.prefix = argv[++i];
      continue;
    }
    if (arg === "--delay" && argv[i + 1]) {
      opts.delayMs = Number(argv[++i]);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: DESCRIPT_API_TOKEN=... node scripts/create-test-projects.mjs [options]

  npm run seed-test-projects -- --count 70 --delay 2000
  npm run seed-test-projects -- 2

Options:
  N, --count N   Projects to create (default: 100)
  --folder PATH   Descript folder path (default: "Raycast Test")
  --no-folder     Create at drive root without a folder
  --team-access   edit|comment|view when using a folder (default: edit)
  --prefix TEXT   Prepended to each title
  --delay MS      Delay between API calls (default: 200)
  --dry-run       Preview titles only
`);
      process.exit(0);
    }
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  if (!Number.isFinite(opts.count) || opts.count < 1 || opts.count > 500) {
    console.error("--count must be between 1 and 500");
    process.exit(1);
  }

  const validTeamAccess = new Set(["edit", "comment", "view"]);
  if (opts.folder && !validTeamAccess.has(opts.teamAccess)) {
    console.error('--team-access must be "edit", "comment", or "view" when using a folder');
    process.exit(1);
  }

  return opts;
}

/** Deterministic pseudo-random lorem title (3–6 words) plus 1-based index. */
function loremTitle(index) {
  const wordCount = 3 + (index % 4);
  const words = [];
  for (let w = 0; w < wordCount; w++) {
    words.push(LOREM_WORDS[(index * 11 + w * 7) % LOREM_WORDS.length]);
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return `${words.join(" ")} ${index + 1}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createEmptyProject(token, { name, folder, teamAccess }) {
  const body = { project_name: name };
  if (folder) {
    body.folder_name = folder;
    // Foldered projects must be visible to drive members (not private "none").
    body.team_access = teamAccess;
  }

  const response = await fetch(`${API_BASE}/v1/jobs/import/project_media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000;
    await sleep(waitMs);
    return createEmptyProject(token, { name, folder, teamAccess });
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}

async function main() {
  const opts = parseArgs(process.argv);
  const token = process.env.DESCRIPT_API_TOKEN?.trim();

  if (!opts.dryRun && !token) {
    console.error(
      "Set DESCRIPT_API_TOKEN to your Descript API token (same value as in Raycast extension preferences).",
    );
    process.exit(1);
  }

  const titles = Array.from({ length: opts.count }, (_, i) => {
    const base = loremTitle(i);
    return opts.prefix ? `${opts.prefix} ${base}` : base;
  });

  console.log(
    opts.dryRun
      ? `Dry run — would create ${opts.count} projects in folder "${opts.folder}":`
      : `Creating ${opts.count} empty projects in folder "${opts.folder}"…`,
  );

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < titles.length; i++) {
    const name = titles[i];
    const label = `[${i + 1}/${titles.length}]`;

    if (opts.dryRun) {
      console.log(`${label} ${name}`);
      continue;
    }

    try {
      const result = await createEmptyProject(token, {
        name,
        folder: opts.folder,
        teamAccess: opts.teamAccess,
      });
      ok++;
      console.log(`${label} ✓ ${name} → ${result.project_id ?? "(no id)"}`);
    } catch (error) {
      failed++;
      console.error(`${label} ✗ ${name}: ${error.message}`);
    }

    if (opts.delayMs > 0 && i < titles.length - 1) {
      await sleep(opts.delayMs);
    }
  }

  if (!opts.dryRun) {
    console.log(`\nDone: ${ok} created, ${failed} failed.`);
    if (ok > 0) {
      console.log(`Open Raycast → Browse Projects and search or scroll to folder "${opts.folder}".`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
