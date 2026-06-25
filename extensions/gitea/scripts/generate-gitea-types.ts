import { constants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_SWAGGER_URL = "https://gitea.com/swagger.v1.json";
const TYPES_OUT_PATH = path.resolve(REPO_ROOT, "src/types/gitea.d.ts");

function getBinPath(command: string): string {
  const extension = process.platform === "win32" ? ".cmd" : "";
  return path.resolve(REPO_ROOT, "node_modules/.bin", `${command}${extension}`);
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

function isUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

async function copyLocalSwagger(source: string, destination: string): Promise<void> {
  const sourcePath = path.resolve(REPO_ROOT, source);
  await fs.access(sourcePath, constants.R_OK);
  await fs.copyFile(sourcePath, destination);
}

async function downloadSwagger(url: string, destination: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await fs.writeFile(destination, await response.text());
}

async function main() {
  const source = process.argv[2] ?? process.env.GITEA_SWAGGER_SOURCE ?? DEFAULT_SWAGGER_URL;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "raycast-gitea-openapi-"));
  const swaggerPath = path.join(tempDir, "swagger.v1.json");
  const openApiPath = path.join(tempDir, "openapi.json");

  try {
    if (isUrl(source)) {
      console.log(`Downloading Swagger spec from ${source}`);
      await downloadSwagger(source, swaggerPath);
    } else {
      console.log(`Using local Swagger spec from ${source}`);
      await copyLocalSwagger(source, swaggerPath);
    }

    console.log("Converting Swagger v2 to OpenAPI v3");
    await run(getBinPath("swagger2openapi"), [swaggerPath, "-o", openApiPath]);

    console.log(`Generating ${path.relative(REPO_ROOT, TYPES_OUT_PATH)}`);
    await run(getBinPath("openapi-typescript"), [openApiPath, "-o", TYPES_OUT_PATH]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
