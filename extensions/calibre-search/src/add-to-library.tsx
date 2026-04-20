import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir, tmpdir } from "os";
import { basename, extname, join } from "path";
import { useEffect, useMemo, useState } from "react";
import {
  isEbookFile,
  parseCalibredbOutput,
  buildCalibredbArgs,
  findOpfPathInContainer,
  findCoverHrefInOpf,
} from "./ebooks";
import { formatFileSize } from "./utils";

interface EbookFile {
  path: string;
  name: string;
  dir: string;
  size: number;
  modifiedAt: Date;
}

const FORMAT_COLORS: Record<string, Color> = {
  ".epub": Color.Blue,
  ".mobi": Color.Orange,
  ".pdf": Color.Red,
  ".azw3": Color.Yellow,
  ".azw": Color.Yellow,
  ".kepub": Color.Purple,
};

const THUMB_DIR = join(tmpdir(), "raycast-calibre-thumbs");
const CALIBREDB = existsSync(
  "/Applications/calibre.app/Contents/MacOS/calibredb",
)
  ? "/Applications/calibre.app/Contents/MacOS/calibredb"
  : "calibredb";

function resolveHome(p: string): string {
  return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}

// Unique cache key derived from full path — prevents collisions between same-named files in different directories
function thumbCacheKey(filePath: string): string {
  return filePath.replace(/[/\\:.~]/g, "_");
}

function scanDirectory(dirPath: string): EbookFile[] {
  try {
    return readdirSync(dirPath)
      .filter(isEbookFile)
      .map((name) => {
        const full = join(dirPath, name);
        const stat = statSync(full);
        return {
          path: full,
          name,
          dir: basename(dirPath),
          size: stat.size,
          modifiedAt: stat.mtime,
        };
      });
  } catch {
    return [];
  }
}

function scanDirectories(paths: (string | undefined)[]): EbookFile[] {
  const seen = new Set<string>();
  return paths
    .filter((p): p is string => Boolean(p))
    .map(resolveHome)
    .flatMap(scanDirectory)
    .filter((f) => (seen.has(f.path) ? false : (seen.add(f.path), true)))
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

function spawnUnzip(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const proc = spawn("unzip", args);
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.on("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(new Error(`unzip exit ${code}`)),
    );
    proc.on("error", reject);
  });
}

async function extractEpubCover(epubPath: string): Promise<string | null> {
  const key = thumbCacheKey(epubPath);
  for (const ext of [".jpg", ".jpeg", ".png"]) {
    const cached = join(THUMB_DIR, key + "-cover" + ext);
    if (existsSync(cached)) return cached;
  }

  try {
    const containerXml = (
      await spawnUnzip(["-p", epubPath, "META-INF/container.xml"])
    ).toString("utf8");
    const opfPath = findOpfPathInContainer(containerXml);
    if (!opfPath) return null;

    const opfXml = (await spawnUnzip(["-p", epubPath, opfPath])).toString(
      "utf8",
    );
    const coverHref = findCoverHrefInOpf(opfXml);
    if (!coverHref) return null;

    const opfDir = opfPath.includes("/")
      ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1)
      : "";
    const imagePath = coverHref.startsWith("/")
      ? coverHref.slice(1)
      : opfDir + coverHref;

    const imageBytes = await spawnUnzip(["-p", epubPath, imagePath]);
    if (!imageBytes.length) return null;

    const imgExt = extname(coverHref) || ".jpg";
    const destPath = join(THUMB_DIR, key + "-cover" + imgExt);
    writeFileSync(destPath, imageBytes);
    return destPath;
  } catch {
    return null;
  }
}

function loadThumbnail(
  file: EbookFile,
  onReady: (path: string) => void,
): () => void {
  const fmt = extname(file.name).toLowerCase();
  let cancelled = false;

  if (fmt === ".epub") {
    extractEpubCover(file.path).then((coverPath) => {
      if (!cancelled && coverPath) onReady(coverPath);
    });
    return () => {
      cancelled = true;
    };
  }

  // PDF and others: Quick Look via qlmanage, isolated per-file subdir to avoid filename collisions
  const qlDir = join(THUMB_DIR, thumbCacheKey(file.path));
  const expectedThumb = join(qlDir, file.name + ".png");

  if (existsSync(expectedThumb)) {
    onReady(expectedThumb);
    return () => {};
  }

  mkdirSync(qlDir, { recursive: true });
  const proc = spawn("qlmanage", ["-t", "-s", "256", "-o", qlDir, file.path]);
  proc.on("error", () => {});
  proc.on("close", () => {
    if (!cancelled && existsSync(expectedThumb)) onReady(expectedThumb);
  });
  return () => {
    cancelled = true;
    proc.kill();
  };
}

function EbookDetail({
  file,
  thumbPath,
}: {
  file: EbookFile;
  thumbPath: string | null;
}) {
  const ext = extname(file.name).toUpperCase().slice(1);
  const cover = thumbPath
    ? `![Cover](${encodeURI(`file://${thumbPath}`)}?raycast-width=90)\n\n`
    : "";

  return (
    <List.Item.Detail
      markdown={cover}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Format" text={ext} />
          <List.Item.Detail.Metadata.Label
            title="Size"
            text={formatFileSize(file.size)}
          />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={file.modifiedAt.toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Path" text={file.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const { libraryPath, searchPath1, searchPath2, searchPath3 } =
    getPreferenceValues<Preferences>();
  const ebooks = useMemo(
    () => scanDirectories([searchPath1, searchPath2, searchPath3]),
    [searchPath1, searchPath2, searchPath3],
  );
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    mkdirSync(THUMB_DIR, { recursive: true });
    const cleanups = ebooks.map((file) =>
      loadThumbnail(file, (path) =>
        setThumbs((prev) => ({ ...prev, [file.path]: path })),
      ),
    );
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [ebooks]);

  async function handleAdd(file: EbookFile) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding to Calibre…",
    });
    const { stdout = "", stderr = "" } = await execFileAsync(
      CALIBREDB,
      buildCalibredbArgs(file.path, libraryPath),
    ).catch((err: Error & { stdout?: string; stderr?: string }) => ({
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
    }));
    const { addedIds } = parseCalibredbOutput(stdout);
    const stderrTrimmed = stderr.trim();

    if (addedIds.length > 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Added: ${basename(file.name, extname(file.name))}`;
      toast.message = `Book id${addedIds.length > 1 ? "s" : ""}: ${addedIds.join(", ")}`;
    } else if (stderrTrimmed.includes("Another calibre program")) {
      // Calibre GUI is running and holds a lock — hand off to the running instance
      await open(file.path, "net.kovidgoyal.calibre");
      toast.style = Toast.Style.Success;
      toast.title = "Sent to Calibre";
      toast.message = "Confirm the book was added in the Calibre window";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add book";
      toast.message = stderrTrimmed || stdout.trim() || "Unknown error";
    }
  }

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search ebooks…"
      navigationTitle="Add to Calibre Library"
    >
      {ebooks.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No ebooks found"
          description="No ebook files found in the configured search paths"
        />
      ) : (
        ebooks.map((file) => {
          const fmt = extname(file.name).toLowerCase();
          const thumbPath = thumbs[file.path] ?? null;
          const icon = thumbPath
            ? { source: thumbPath }
            : { source: Icon.Book };
          const formatTag = {
            tag: {
              value: fmt.toUpperCase().slice(1),
              color: FORMAT_COLORS[fmt] ?? Color.SecondaryText,
            },
          };

          return (
            <List.Item
              key={file.path}
              icon={icon}
              title={basename(file.name, extname(file.name))}
              subtitle={file.dir}
              accessories={[formatTag, { text: formatFileSize(file.size) }]}
              detail={<EbookDetail file={file} thumbPath={thumbPath} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Add to Calibre Library"
                    icon={Icon.Plus}
                    onAction={() => handleAdd(file)}
                  />
                  <Action.ShowInFinder
                    path={file.path}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
