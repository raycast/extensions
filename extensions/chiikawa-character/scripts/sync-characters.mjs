#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const OFFICIAL_CHARACTERS_URL = "https://www.chiikawaofficial.com/characters/";
const OFFICIAL_HOME_URL = "https://www.chiikawaofficial.com/home/";

const CHARACTER_ORDER = [
  "chiikawa",
  "hachiware",
  "usagi",
  "momonga",
  "rakko",
  "kurimanju",
  "shisa",
  "furuhonya",
  "pochette-no-yoroi-san",
  "roudou-no-yoroi-san",
  "ramen-no-yoroi-san",
];

const CHARACTER_META = {
  chiikawa: {
    anchor: "chiikawa",
    nameEn: "Chiikawa",
    nameRomanized: "chiikawa",
    category: "main",
    personality: ["Gentle", "Shy", "Anxious", "Kind"],
    relationships: [
      { character: "Hachiware", description: "Best friend who supports Chiikawa through fears." },
      { character: "Usagi", description: "Chaotic friend who often pulls Chiikawa into adventures." },
    ],
    funFacts: ["Name comes from 'small and cute'.", "Often shown with anxious tears in emotional moments."],
  },
  hachiware: {
    anchor: "hachiware",
    nameEn: "Hachiware",
    nameRomanized: "hachiware",
    category: "main",
    personality: ["Optimistic", "Supportive", "Curious", "Friendly"],
    relationships: [
      { character: "Chiikawa", description: "Core best-friend bond built on trust and care." },
      { character: "Usagi", description: "Friend whose wild energy contrasts Hachiware's calm optimism." },
    ],
    funFacts: ["Name references a black-and-white split pattern.", "Often acts as an emotional anchor in the trio."],
  },
  usagi: {
    anchor: "usagi",
    nameEn: "Usagi",
    nameRomanized: "usagi",
    category: "main",
    personality: ["Energetic", "Fearless", "Mysterious", "Chaotic"],
    relationships: [
      { character: "Chiikawa", description: "Protective friend who frequently drags Chiikawa into bold situations." },
      { character: "Hachiware", description: "Complements Hachiware's calm with wild spontaneity." },
    ],
    funFacts: ["Known for catchphrases like 'Yaha!' and 'Ura!'.", "One of the most meme-loved characters by fans."],
    catchphrases: ["Yaha!", "Ura!"],
  },
  momonga: {
    anchor: "momonga",
    nameEn: "Momonga",
    nameRomanized: "momonga",
    category: "friends",
    personality: ["Demanding", "Manipulative", "Cute", "Showy"],
    relationships: [
      { character: "Roudou no Yoroi-san", description: "Frequently causes trouble during work-related interactions." },
      { character: "Furuhonya", description: "Gives Furuhonya a crab headband." },
    ],
    funFacts: ["Can glide or fly.", "Uses cuteness as leverage in conversations."],
  },
  rakko: {
    anchor: "rakko",
    nameEn: "Rakko",
    nameRomanized: "rakko",
    category: "friends",
    personality: ["Skilled", "Calm", "Reliable", "Strong"],
    relationships: [
      { character: "Chiikawa and friends", description: "A respected senior figure admired for combat skills." },
    ],
    funFacts: ["Recognized as a No.1 hunter.", "Has a well-known love of sweets."],
  },
  kurimanju: {
    anchor: "kurimanju",
    nameEn: "Kurimanju",
    nameRomanized: "kurimanju",
    category: "friends",
    personality: ["Quiet", "Composed", "Mature", "Relaxed"],
    relationships: [
      { character: "Friend group", description: "Acts as a steady, calm presence among energetic personalities." },
    ],
    funFacts: ["Known as a beverage enthusiast.", "Has a drinking license in-universe."],
  },
  shisa: {
    anchor: "shisa",
    nameEn: "Shisa",
    nameRomanized: "shisa",
    category: "friends",
    personality: ["Hard-working", "Earnest", "Loyal", "Humble"],
    relationships: [{ character: "Ramen no Yoroi-san", description: "Boss and mentor figure at ramen shop Rou." }],
    funFacts: ["Works at ramen shop Rou.", "Aspires to become fully capable in the shop."],
  },
  furuhonya: {
    anchor: "furuhonya",
    nameEn: "Furuhonya",
    nameRomanized: "furuhonya",
    category: "friends",
    personality: ["Bookish", "Gentle", "Quiet", "Thoughtful"],
    relationships: [{ character: "Momonga", description: "Receives a crab headband from Momonga." }],
    funFacts: ["Associated with used books and reading culture.", "Often depicted with the crab headband gift."],
  },
  "pochette-no-yoroi-san": {
    anchor: "pouchette",
    nameEn: "Pochette no Yoroi-san",
    nameRomanized: "pochette no yoroi san",
    category: "yoroi-san",
    personality: ["Gentle", "Crafty", "Protective", "Thoughtful"],
    relationships: [
      { character: "Chiikawa and friends", description: "Supports the cast through handmade goods and kindness." },
    ],
    funFacts: ["Loves cute things.", "Noted for crafting pajamas."],
  },
  "roudou-no-yoroi-san": {
    anchor: "roudou",
    nameEn: "Roudou no Yoroi-san",
    nameRomanized: "roudou no yoroi san",
    category: "yoroi-san",
    personality: ["Orderly", "Responsible", "Practical", "Patient"],
    relationships: [{ character: "Momonga", description: "Frequent target of Momonga's troublesome antics." }],
    funFacts: ["Manages task assignments.", "Represents workplace structure in the series."],
  },
  "ramen-no-yoroi-san": {
    anchor: "ramen",
    nameEn: "Ramen no Yoroi-san",
    nameRomanized: "ramen no yoroi san",
    category: "yoroi-san",
    personality: ["Disciplined", "Supportive", "Serious", "Kind"],
    relationships: [{ character: "Shisa", description: "Boss and admired mentor at ramen shop Rou." }],
    funFacts: ["Runs ramen shop Rou.", "Connected to many food-centric fan-favorite scenes."],
  },
};

const IMAGE_MARKERS = {
  chiikawa: /chii\+button\.png/i,
  hachiware: /hachi\+button\.png/i,
  usagi: /usagi\+button\.png/i,
  momonga: /momonga\+/i,
  rakko: /rakko\+/i,
  kurimanju: /kurimanju\+/i,
  shisa: /shisa\+/i,
  furuhonya: /furuhonya\+/i,
  "pochette-no-yoroi-san": /chii\+buttons\+pou?che+tte\.png/i,
  "roudou-no-yoroi-san": /chii\+buttons\+roudou\.png/i,
  "ramen-no-yoroi-san": /chii\+buttons\+ramen\.png/i,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const assetsDir = path.join(projectRoot, "assets");
const dataFile = path.join(projectRoot, "src", "data", "characters.ts");
const imageSnapshotFile = path.join(projectRoot, "scripts", "character-image-urls.snapshot.json");
const tmpDir = path.join(projectRoot, ".tmp", "character-sync");
const shouldRefreshImageSnapshot = process.argv.includes("--refresh-image-snapshot");

function decodeHtml(input) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "-")
    .replace(/&#x27;/g, "'");
}

function normalizeText(input) {
  return decodeHtml(input)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeTs(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toTsStringArray(values) {
  return `[${values.map((item) => `"${escapeTs(item)}"`).join(", ")}]`;
}

function toTsRelationships(values) {
  const parts = values.map(
    (item) => `{ character: "${escapeTs(item.character)}", description: "${escapeTs(item.description)}" }`,
  );
  return `[${parts.join(", ")}]`;
}

function parseSection(html, anchor, nextAnchor) {
  const startMarker = `<p id="${anchor}"`;
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Could not find anchor section for "${anchor}"`);
  }

  let endIdx = html.length;
  if (nextAnchor) {
    const nextIdx = html.indexOf(`<p id="${nextAnchor}"`, startIdx + startMarker.length);
    if (nextIdx !== -1) endIdx = nextIdx;
  }
  return html.slice(startIdx, endIdx);
}

function parseJpName(section) {
  const match = section.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (!match) {
    throw new Error("Could not parse Japanese name from section");
  }
  return normalizeText(match[1]);
}

function parseDescription(section) {
  const match = section.match(/<p[^>]*style="white-space:pre-wrap;"[^>]*>([\s\S]*?)<\/p>/i);
  if (!match) {
    throw new Error("Could not parse description paragraph from section");
  }
  return normalizeText(match[1]);
}

async function fetchHtml() {
  const response = await fetch(OFFICIAL_CHARACTERS_URL, {
    headers: { "User-Agent": "chiikawa-character-sync-script" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${OFFICIAL_CHARACTERS_URL}: ${response.status}`);
  }
  return response.text();
}

async function fetchHomeHtml() {
  const response = await fetch(OFFICIAL_HOME_URL, {
    headers: { "User-Agent": "chiikawa-character-sync-script" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${OFFICIAL_HOME_URL}: ${response.status}`);
  }
  return response.text();
}

async function downloadToFile(url, filePath) {
  const response = await fetch(url, { headers: { "User-Agent": "chiikawa-character-sync-script" } });
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url} (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(filePath, bytes);
}

function convertToPng(inputPath, outputPath) {
  const result = spawnSync("ffmpeg", ["-y", "-i", inputPath, "-vf", "scale=768:768", outputPath], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${path.basename(outputPath)}: ${result.stderr || "unknown error"}`);
  }
}

function formatGeneratedDataFile() {
  const prettierBin = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prettier.cmd" : "prettier",
  );

  const result = spawnSync(prettierBin, ["--write", dataFile], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    throw new Error(`Failed to format generated data file with Prettier: ${result.stderr || result.error || "unknown"}`);
  }
}

function parseHomeIconImageUrls(homeHtml) {
  const candidates = [...homeHtml.matchAll(/data-src="(https:\/\/images\.squarespace-cdn\.com[^"]+)"/g)]
    .map((item) => item[1])
    .filter((url) => /\.png(\?|$)/i.test(url));

  const byId = {};

  for (const id of CHARACTER_ORDER) {
    const matcher = IMAGE_MARKERS[id];
    const match = candidates.find((url) => matcher.test(url));
    if (match) {
      byId[id] = match;
    }
  }

  return byId;
}

function isValidImageUrl(url) {
  return typeof url === "string" && /^https:\/\/images\.squarespace-cdn\.com\/.+/i.test(url);
}

function isCompleteImageUrlMap(map) {
  return CHARACTER_ORDER.every((id) => isValidImageUrl(map[id]));
}

async function readImageSnapshot() {
  try {
    const raw = await readFile(imageSnapshotFile, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.urlsById || typeof parsed.urlsById !== "object") {
      return null;
    }
    return parsed.urlsById;
  } catch {
    return null;
  }
}

async function writeImageSnapshot(urlsById) {
  const snapshot = {
    source: OFFICIAL_HOME_URL,
    updatedAt: new Date().toISOString(),
    urlsById,
  };
  await writeFile(imageSnapshotFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

function generateDataFile(characters) {
  const rows = characters
    .map((character) => {
      const meta = CHARACTER_META[character.id];
      const catchphrases = meta.catchphrases ? `,\n    catchphrases: ${toTsStringArray(meta.catchphrases)}` : "";
      return `  {
    id: "${character.id}",
    nameEn: "${escapeTs(meta.nameEn)}",
    nameJp: "${escapeTs(character.nameJp)}",
    nameRomanized: "${escapeTs(meta.nameRomanized)}",
    category: "${meta.category}",
    personality: ${toTsStringArray(meta.personality)},
    description: "${escapeTs(character.description)}",
    relationships: ${toTsRelationships(meta.relationships)},
    funFacts: ${toTsStringArray(meta.funFacts)},
    icon: asset("${character.id}.png"),
    officialUrl: officialCharacterUrl("${character.id}")${catchphrases}
  }`;
    })
    .join(",\n");

  const anchorMap = CHARACTER_ORDER.map((id) => `  "${id}": "${CHARACTER_META[id].anchor}",`).join("\n");

  return `import { environment } from "@raycast/api";
import path from "node:path";
import { ChiikawaCharacter, CharacterCategory } from "../types/character";

const OFFICIAL_CHARACTERS_BASE_URL = "https://www.chiikawaofficial.com/characters";

const OFFICIAL_CHARACTER_ANCHOR_BY_ID: Record<string, string> = {
${anchorMap}
};

export const CATEGORY_LABELS: Record<CharacterCategory, string> = {
  main: "Main Trio",
  friends: "Friends",
  "yoroi-san": "Yoroi-san",
};

const asset = (name: string) => path.join(environment.assetsPath, name);
const officialCharacterUrl = (id: string) =>
  \`\${OFFICIAL_CHARACTERS_BASE_URL}/#\${OFFICIAL_CHARACTER_ANCHOR_BY_ID[id] ?? id}\`;

export const CHARACTERS: ChiikawaCharacter[] = [
${rows}
];
`;
}

async function main() {
  await mkdir(tmpDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const html = await fetchHtml();
  let lockedImageUrlsById = shouldRefreshImageSnapshot ? null : await readImageSnapshot();

  if (!lockedImageUrlsById || !isCompleteImageUrlMap(lockedImageUrlsById)) {
    const homeHtml = await fetchHomeHtml();
    lockedImageUrlsById = parseHomeIconImageUrls(homeHtml);
    if (!isCompleteImageUrlMap(lockedImageUrlsById)) {
      const missing = CHARACTER_ORDER.filter((id) => !lockedImageUrlsById[id]).join(", ");
      throw new Error(`Failed to build complete image URL map. Missing: ${missing}`);
    }
    await writeImageSnapshot(lockedImageUrlsById);
    console.log(`Wrote locked image URL snapshot: ${path.relative(projectRoot, imageSnapshotFile)}`);
  }

  const characters = [];

  for (let index = 0; index < CHARACTER_ORDER.length; index += 1) {
    const id = CHARACTER_ORDER[index];
    const meta = CHARACTER_META[id];
    const nextId = CHARACTER_ORDER[index + 1];
    const nextAnchor = nextId ? CHARACTER_META[nextId].anchor : null;

    const section = parseSection(html, meta.anchor, nextAnchor);
    const nameJp = parseJpName(section);
    const description = parseDescription(section);
    const imageUrl = lockedImageUrlsById[id];

    const tmpSource = path.join(tmpDir, `${id}.source`);
    const finalPng = path.join(assetsDir, `${id}.png`);

    await downloadToFile(imageUrl, tmpSource);
    convertToPng(tmpSource, finalPng);

    characters.push({ id, nameJp, description, imageUrl });
  }

  const generatedTs = generateDataFile(characters);
  await writeFile(dataFile, generatedTs, "utf8");
  formatGeneratedDataFile();

  const cachePath = path.join(tmpDir, "last-sync.json");
  await writeFile(cachePath, JSON.stringify({ updatedAt: new Date().toISOString(), characters }, null, 2), "utf8");

  console.log(`Updated ${characters.length} characters in src/data/characters.ts`);
  console.log(`Downloaded refreshed images to assets/*.png`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // no-op
    }
  });
