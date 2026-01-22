#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SKILLS_URL = "https://skills.sh/";

async function fetchSkills() {
  const response = await fetch(SKILLS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch skills: ${response.status}`);
  }

  const html = await response.text();
  const regex =
    /href="\/([^/]+)\/([^/]+)\/([^"]+)"[\s\S]*?<span[^>]*>(\d+)<\/span>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*>([^<]+)<\/p>[\s\S]*?<span[^>]*>([^<]+)<\/span>/gi;
  const skills = [];
  const seen = new Set();

  let match;
  while ((match = regex.exec(html)) !== null) {
    const rank = Number(match[4]);
    const name = match[5].trim();
    const repo = match[6].trim();
    const installs = match[7].trim();
    const key = `${rank}-${name}-${repo}`;

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    skills.push({ rank, name, repo, installs });
  }

  return skills.sort((a, b) => a.rank - b.rank);
}

async function main() {
  const outputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), "skills-leaderboard.json");

  const skills = await fetchSkills();
  fs.writeFileSync(outputPath, JSON.stringify(skills, null, 2));
  console.log(`Wrote ${skills.length} skills to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
