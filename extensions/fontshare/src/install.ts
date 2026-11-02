import { open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, extname, join, sep } from "node:path";
import { promisify } from "node:util";
import { fetchFontshare } from "./api";

const run = promisify(execFile);
const FONTS_DIR = join(homedir(), "Library", "Fonts");

export const canInstallFonts = process.platform === "darwin";

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name));
}

/**
 * Fontshare zips hold desktop fonts in Fonts/OTF (static) and Fonts/TTF (usually variable), plus web formats in
 * Fonts/WEB. Install the static OTFs when there are any, then desktop TTFs, and only fall back to the web TTFs for
 * families that ship nothing else. Kits contain one such folder per family, so pick each family separately.
 */
export function fontsToInstall(files: string[]): string[] {
  const families = new Map<string, string[]>();
  for (const file of files) {
    const parts = file.split(sep);
    const fontsIndex = parts.lastIndexOf("Fonts");
    const family = fontsIndex >= 0 ? parts.slice(0, fontsIndex).join(sep) : "";
    families.set(family, [...(families.get(family) ?? []), file]);
  }

  return [...families.values()].flatMap((familyFiles) => {
    const isWeb = (file: string) => file.split(sep).includes("WEB");
    const withExtension = (extension: string, web: boolean) =>
      familyFiles.filter((file) => extname(file).toLowerCase() === extension && isWeb(file) === web);
    const candidates = [withExtension(".otf", false), withExtension(".ttf", false), withExtension(".ttf", true)];
    return candidates.find((group) => group.length > 0) ?? [];
  });
}

/** Downloads a Fontshare zip and copies its desktop fonts to ~/Library/Fonts (macOS only). */
export async function installFonts(url: string, title: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Installing ${title}…` });
  let workDir: string | undefined;

  try {
    workDir = await mkdtemp(join(tmpdir(), "fontshare-"));
    const response = await fetchFontshare(url);
    const zip = join(workDir, "fonts.zip");
    await writeFile(zip, Buffer.from(await response.arrayBuffer()));
    // ditto ships with macOS and extracts zips without a dependency.
    await run("ditto", ["-x", "-k", zip, join(workDir, "fonts")]);

    const fonts = fontsToInstall(await listFiles(join(workDir, "fonts")));
    if (fonts.length === 0) {
      throw new Error("The download contains no desktop font files");
    }
    await mkdir(FONTS_DIR, { recursive: true });
    await Promise.all(fonts.map((font) => copyFile(font, join(FONTS_DIR, basename(font)))));

    toast.style = Toast.Style.Success;
    toast.title = `Installed ${title}`;
    toast.message = `${fonts.length} ${fonts.length === 1 ? "font" : "fonts"} added to ~/Library/Fonts`;
    toast.primaryAction = { title: "Open Font Book", onAction: () => open("/System/Applications/Font Book.app") };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Could not install ${title}`;
    toast.message = error instanceof Error ? error.message : String(error);
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}
