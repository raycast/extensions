import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = ".verify";

export function writeVerificationEvidence(root, name, details = {}) {
  const filePath = evidencePath(root, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        name,
        createdAt: new Date().toISOString(),
        ...details,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return filePath;
}

export function readFreshVerificationEvidence(root, name, relativePaths) {
  const filePath = evidencePath(root, name);
  if (!fs.existsSync(filePath)) {
    return { fresh: false, reason: "missing", filePath };
  }

  const evidence = readEvidenceFile(filePath);
  if (!evidence) {
    return { fresh: false, reason: "invalid", filePath };
  }

  const createdAt = Date.parse(evidence.createdAt);
  if (!Number.isFinite(createdAt)) {
    return { fresh: false, reason: "invalid timestamp", filePath, evidence };
  }

  const stalePath = findNewerPath(root, relativePaths, createdAt);
  if (stalePath) {
    return { fresh: false, reason: `stale after ${stalePath}`, filePath, evidence };
  }

  return { fresh: true, filePath, evidence };
}

function evidencePath(root, name) {
  return path.join(root, EVIDENCE_DIR, `${name}.json`);
}

function readEvidenceFile(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findNewerPath(root, relativePaths, timestamp) {
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const newer = findNewerPathInTree(absolutePath, relativePath, timestamp);
    if (newer) return newer;
  }
  return null;
}

function findNewerPathInTree(absolutePath, displayPath, timestamp) {
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(absolutePath)) {
      if (entry === "dist" || entry === "node_modules" || entry === ".verify") continue;
      const newer = findNewerPathInTree(path.join(absolutePath, entry), path.join(displayPath, entry), timestamp);
      if (newer) return newer;
    }
    return null;
  }

  return stat.mtimeMs > timestamp ? displayPath : null;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
