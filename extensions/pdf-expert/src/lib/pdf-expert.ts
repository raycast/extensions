import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join } from "path";

const APP_NAME = "PDF Expert";
const SFL4_PATH = join(
  homedir(),
  "Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.ApplicationRecentDocuments/com.readdle.pdfexpert-mac.sfl4",
);

export interface PdfFile {
  name: string;
  fullName: string;
  path: string;
  folder: string;
  exists: boolean;
}

export function isInstalled(): boolean {
  return existsSync(`/Applications/${APP_NAME}.app`);
}

export function isRunning(): boolean {
  try {
    const result = execFileSync("pgrep", ["-x", APP_NAME], {
      encoding: "utf-8",
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

export function getOpenTabs(): PdfFile[] {
  try {
    const pid = execFileSync("pgrep", ["-x", APP_NAME], {
      encoding: "utf-8",
    })
      .trim()
      .split("\n")[0];

    if (!pid) return [];

    const output = execFileSync("lsof", ["-F", "n", "-p", pid], {
      encoding: "utf-8",
    });

    const paths = new Set<string>();
    for (const line of output.split("\n")) {
      if (line.startsWith("n") && /\.pdf$/i.test(line)) {
        paths.add(line.slice(1));
      }
    }

    return [...paths]
      .map(pathToPdfFile)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function getRecentDocuments(): PdfFile[] {
  if (!existsSync(SFL4_PATH)) return [];

  const jxaScript = `
ObjC.import("Foundation")
var data = $.NSData.dataWithContentsOfFile("${SFL4_PATH}")
if (!data || data.isEqualTo($()))  {
  "[]"
} else {
  var unarchiver = $.NSKeyedUnarchiver.alloc.initForReadingFromDataError(data, $())
  unarchiver.requiresSecureCoding = false
  var root = unarchiver.decodeObjectForKey("root")
  var items = root.objectForKey("items")
  var results = []
  for (var i = 0; i < items.count; i++) {
    var item = items.objectAtIndex(i)
    var bookmarkData = item.objectForKey("Bookmark")
    if (bookmarkData && !bookmarkData.isEqualTo($()))  {
      var url = $.NSURL.URLByResolvingBookmarkDataOptionsRelativeToURLBookmarkDataIsStaleError(
        bookmarkData, 0x100, $(), $(), $()
      )
      if (url && !url.isEqualTo($()))  {
        results.push(ObjC.unwrap(url.path))
      }
    }
  }
  JSON.stringify(results)
}`;

  try {
    const output = execFileSync(
      "osascript",
      ["-l", "JavaScript", "-e", jxaScript],
      {
        encoding: "utf-8",
        timeout: 5000,
      },
    ).trim();

    const paths: string[] = JSON.parse(output);
    return paths.slice(0, 10).map(pathToPdfFile);
  } catch {
    return [];
  }
}

export function switchToTab(filePath: string): void {
  execFileSync("open", ["-a", APP_NAME, filePath]);
}

export function openApp(): void {
  execFileSync("open", ["-a", APP_NAME]);
}

export function revealInFinder(filePath: string): void {
  execFileSync("open", ["-R", filePath]);
}

function pathToPdfFile(filePath: string): PdfFile {
  const ext = filePath.match(/\.pdf$/i)?.[0] ?? "";
  return {
    name: basename(filePath, ext),
    fullName: basename(filePath),
    path: filePath,
    folder: dirname(filePath),
    exists: existsSync(filePath),
  };
}
