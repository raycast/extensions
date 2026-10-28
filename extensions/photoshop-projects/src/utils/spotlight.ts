import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { DocumentDimensions, PhotoshopFile } from "../types";
import { formatBytes, isValidPhotoshopExtension, stripExtension } from "./format";

const execFileAsync = promisify(execFile);

export interface RawMetadata {
  pixelWidth?: number;
  pixelHeight?: number;
  dpi?: number;
  colorSpace?: string;
  layers?: string[];
  lastUsedDate?: Date;
}

export async function runMdfind(query: string, scope?: string, maxResults = 100): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args: string[] = [];
    if (scope && scope.trim().length > 0) {
      args.push("-onlyin", scope);
    }
    args.push(query);

    const child = spawn("/usr/bin/mdfind", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const paths: string[] = [];
    let remainder = "";
    let closed = false;

    const timeout = setTimeout(() => {
      if (!closed) {
        closed = true;
        child.kill();
        resolve(paths);
      }
    }, 6000);

    child.stdout.on("data", (chunk: Buffer) => {
      if (closed) return;
      remainder += chunk.toString("utf8");
      const lines = remainder.split("\n");
      remainder = lines.pop() || "";

      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (trimmed.length > 0 && fs.existsSync(trimmed)) {
          paths.push(trimmed);
          if (paths.length >= maxResults) {
            closed = true;
            clearTimeout(timeout);
            child.kill();
            resolve(paths);
            return;
          }
        }
      }
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      if (!closed) {
        closed = true;
        reject(err);
      }
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (!closed) {
        closed = true;
        if (code !== 0 && code !== null && paths.length === 0) {
          reject(new Error(stderr.trim() || `mdfind exited with code ${code}`));
        } else {
          if (remainder.trim().length > 0 && paths.length < maxResults && fs.existsSync(remainder.trim())) {
            paths.push(remainder.trim());
          }
          resolve(paths);
        }
      }
    });
  });
}

export async function getFileMetadata(filePath: string): Promise<RawMetadata> {
  try {
    if (!fs.existsSync(filePath)) return {};

    const { stdout } = await execFileAsync(
      "/usr/bin/mdls",
      [
        "-name",
        "kMDItemPixelWidth",
        "-name",
        "kMDItemPixelHeight",
        "-name",
        "kMDItemResolutionHeightDPI",
        "-name",
        "kMDItemColorSpace",
        "-name",
        "kMDItemLayerNames",
        "-name",
        "kMDItemLastUsedDate",
        filePath,
      ],
      { timeout: 3000, encoding: "utf8" },
    );

    const metadata: RawMetadata = {};

    const widthMatch = stdout.match(/kMDItemPixelWidth\s*=\s*(\d+)/);
    if (widthMatch) metadata.pixelWidth = parseInt(widthMatch[1], 10);

    const heightMatch = stdout.match(/kMDItemPixelHeight\s*=\s*(\d+)/);
    if (heightMatch) metadata.pixelHeight = parseInt(heightMatch[1], 10);

    const dpiMatch = stdout.match(/kMDItemResolutionHeightDPI\s*=\s*(\d+)/);
    if (dpiMatch) metadata.dpi = parseInt(dpiMatch[1], 10);

    const colorMatch = stdout.match(/kMDItemColorSpace\s*=\s*"([^"]+)"/);
    if (colorMatch) metadata.colorSpace = colorMatch[1];

    const lastUsedMatch = stdout.match(/kMDItemLastUsedDate\s*=\s*([0-9-]+\s+[0-9:]+\s+\+[0-9]+)/);
    if (lastUsedMatch) {
      const parsedDate = new Date(lastUsedMatch[1]);
      if (!isNaN(parsedDate.getTime())) metadata.lastUsedDate = parsedDate;
    }

    const layerBlock = stdout.match(/kMDItemLayerNames\s*=\s*\(([\s\S]*?)\)/);
    if (layerBlock && layerBlock[1]) {
      const layerMatches = [...layerBlock[1].matchAll(/"([^"]+)"/g)];
      metadata.layers = layerMatches.map((m) => m[1]);
    }

    return metadata;
  } catch {
    return {};
  }
}

export async function createPhotoshopFile(filePath: string, metadata?: RawMetadata): Promise<PhotoshopFile | null> {
  try {
    if (!fs.existsSync(filePath)) return null;

    const stats = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).replace(".", "").toLowerCase();

    if (!isValidPhotoshopExtension(ext)) return null;

    const directory = path.dirname(filePath);
    const directoryName = path.basename(directory);

    const meta = metadata ?? (await getFileMetadata(filePath));

    let dimensions: DocumentDimensions | undefined;
    if (meta.pixelWidth && meta.pixelHeight) {
      dimensions = {
        width: meta.pixelWidth,
        height: meta.pixelHeight,
        dpi: meta.dpi,
        aspectRatio: `${meta.pixelWidth}:${meta.pixelHeight}`,
      };
    }

    return {
      id: filePath,
      name: fileName,
      title: stripExtension(fileName),
      path: filePath,
      directory,
      directoryName,
      extension: ext,
      sizeInBytes: stats.size,
      formattedSize: formatBytes(stats.size),
      lastModifiedDate: stats.mtime,
      lastOpenedDate: meta.lastUsedDate,
      dimensions,
      colorSpace: meta.colorSpace,
      layers: meta.layers,
      exists: true,
    };
  } catch {
    return null;
  }
}
