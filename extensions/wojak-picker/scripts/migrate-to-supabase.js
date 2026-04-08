#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(process.cwd(), ".env.local");
const MANIFEST_PATH = path.join(process.cwd(), "assets/wojaks.json");
const BATCH_SIZE = 250;
const UPLOAD_CONCURRENCY = 6;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function contentTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function publicObjectUrl(supabaseUrl, bucket, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) ${url}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function uploadObject(config, objectPath, buffer, contentType) {
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${config.bucket}/${objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

  await request(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buffer,
  });
}

async function insertRows(config, rows) {
  await request(`${config.supabaseUrl}/rest/v1/wojaks?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
}

async function runWithConcurrency(items, limit, worker) {
  let nextIndex = 0;

  async function consume() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => consume()));
}

async function main() {
  loadEnvFile(ENV_PATH);

  const config = {
    supabaseUrl: requiredEnv("SUPABASE_URL").replace(/\/$/, ""),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    bucket: process.env.SUPABASE_BUCKET || "wojaks",
  };

  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing local manifest at ${MANIFEST_PATH}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const rows = [];
  const missingLocalFiles = [];

  console.log(`Uploading ${manifest.length} local assets to bucket "${config.bucket}"...`);

  await runWithConcurrency(manifest, UPLOAD_CONCURRENCY, async (item, index) => {
    const localPath = path.join(process.cwd(), item.localPath);
    if (!fs.existsSync(localPath)) {
      missingLocalFiles.push({ filename: item.filename, localPath });
      return;
    }

    const objectPath = `${item.slug}/${item.filename}`;
    const buffer = fs.readFileSync(localPath);
    await uploadObject(config, objectPath, buffer, contentTypeFor(item.filename));

    const publicUrl = publicObjectUrl(config.supabaseUrl, config.bucket, objectPath);
    rows[index] = {
      id: item.id,
      name: item.name,
      category: item.category,
      filename: item.filename,
      thumb_url: publicUrl,
      full_url: publicUrl,
    };

    if ((index + 1) % 100 === 0 || index === manifest.length - 1) {
      console.log(`Uploaded ${index + 1}/${manifest.length}`);
    }
  });

  console.log("Upserting metadata rows into public.wojaks...");
  const populatedRows = rows.filter(Boolean);
  for (let index = 0; index < populatedRows.length; index += BATCH_SIZE) {
    const batch = populatedRows.slice(index, index + BATCH_SIZE);
    await insertRows(config, batch);
    console.log(`Inserted ${Math.min(index + BATCH_SIZE, populatedRows.length)}/${populatedRows.length} rows`);
  }

  if (missingLocalFiles.length > 0) {
    console.log(
      `Skipped ${missingLocalFiles.length} missing local files: ${missingLocalFiles.map((item) => item.filename).join(", ")}`,
    );
  }

  console.log("Supabase migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
