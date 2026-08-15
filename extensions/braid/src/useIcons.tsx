import { environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "path";
import { z } from "zod";
import { pascalCase } from "change-case";
import fs from "fs";

const SvgFileIndex = z.object({
  type: z.string(),
  name: z.string(),
  download_url: z.string(),
  sha: z.string(),
});

type SvgFileIndex = z.infer<typeof SvgFileIndex>;
const Contents = z.array(SvgFileIndex);

const CACHE_DIR = path.join(environment.supportPath, "braid-icons-cache");
const METADATA_CACHE_FILE = path.join(CACHE_DIR, "metadata.json");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CachedMetadata {
  timestamp: number;
  files: Array<{
    name: string;
    sha: string;
    download_url: string;
    iconName: string;
  }>;
}

function getFileContent(sha: string, name: string): string | null {
  const cachePath = path.join(CACHE_DIR, `${sha}-${name}`);
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf-8");
  }
  return null;
}

function saveFileContent(sha: string, name: string, content: string): void {
  const cachePath = path.join(CACHE_DIR, `${sha}-${name}`);
  fs.writeFileSync(cachePath, content, "utf-8");
}

function getCachedMetadata(): CachedMetadata | null {
  try {
    if (fs.existsSync(METADATA_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(METADATA_CACHE_FILE, "utf-8"));
      return data as CachedMetadata;
    }
  } catch (error) {
    console.error("Error reading metadata cache:", error);
  }
  return null;
}

function saveCachedMetadata(metadata: CachedMetadata): void {
  fs.writeFileSync(METADATA_CACHE_FILE, JSON.stringify(metadata, null, 2), "utf-8");
}

const darkifyIcon = (light: string): string => {
  // Replace black colors with white
  let darkSvg = light
    .replace(/fill="#000"/g, 'fill="#ffffff"')
    .replace(/fill="black"/g, 'fill="#ffffff"')
    .replace(/stroke="#000"/g, 'stroke="#ffffff"')
    .replace(/stroke="black"/g, 'stroke="#ffffff"');

  // Add fill attributes to elements that don't have one
  // This matches path, rect, circle tags without a fill attribute and adds white fill
  darkSvg = darkSvg.replace(/(<(?:path|rect|circle)[^>]*?)(\s*\/?>)/g, (match, p1, p2) => {
    // Only add fill if the element doesn't already have one
    if (!p1.includes("fill=")) {
      return `${p1} fill="#ffffff"${p2}`;
    }
    return match;
  });

  return darkSvg;
};

export const useIcons = () => {
  const { isLoading, data, error } = usePromise(async () => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const cachedMetadata = getCachedMetadata();
    const isCacheValid = cachedMetadata && now - cachedMetadata.timestamp < oneDayMs;

    let fileMetadata: CachedMetadata["files"] = [];

    if (!isCacheValid) {
      const response = await fetch(
        "https://api.github.com/repos/seek-oss/braid-design-system/contents/packages/braid-design-system/icons",
        {
          headers: {
            Accept: "application/vnd.github+json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch icons folder: ${response.status} ${response.statusText}`);
      }

      const items = Contents.parse(await response.json());

      fileMetadata = items
        .filter((item) => item.type === "file" && item.name.toLowerCase().endsWith(".svg"))
        .filter((item) => !item.name.includes("-"))
        .map((file) => {
          const svgName = path.basename(file.name, ".svg");
          const isAllCaps = svgName.toUpperCase() === svgName;
          const iconName = `Icon${isAllCaps ? svgName : pascalCase(svgName)}`;

          return {
            name: file.name,
            sha: file.sha,
            download_url: file.download_url,
            iconName: iconName,
          };
        });

      saveCachedMetadata({
        timestamp: now,
        files: fileMetadata,
      });
    } else {
      fileMetadata = cachedMetadata.files;
    }

    const fileContentsPromises = fileMetadata.map(async (file) => {
      let content = getFileContent(file.sha, file.name);

      if (!content) {
        const contentResponse = await fetch(file.download_url);
        if (!contentResponse.ok) {
          throw new Error(`Failed to fetch file ${file.name}: ${contentResponse.status}`);
        }
        content = await contentResponse.text();
        saveFileContent(file.sha, file.name, content);
      }

      return {
        iconName: file.iconName,
        content,
        darkContent: darkifyIcon(content),
      };
    });

    return Promise.all(fileContentsPromises);
  }, []);

  return { isLoading, svgFiles: data, error };
};
