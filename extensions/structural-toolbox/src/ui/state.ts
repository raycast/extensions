import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import { existsSync, readdirSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { useEffect, useState } from "react";
import { Library, loadLibrary, migrateLibrary } from "../core/library";
import { Material, Section } from "../core/types";
import { sectionFromRow } from "../core/sections";
import { initializeRenderer, pngFromSVG } from "./raster";
export interface Preferences {
  libraryDirectory?: string;
  defaultMaterial?: string;
  precision?: string;
  diagramTextSize?: string;
}
export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
export function libraryDirectoryPath() {
  return preferences().libraryDirectory?.trim() || join(environment.supportPath, "library");
}
export function libraryDirectory() {
  const dir = libraryDirectoryPath();
  mkdirSync(dir, { recursive: true });
  const newLibrary = !existsSync(join(dir, "materials.csv")) && !existsSync(join(dir, "sections.csv"));
  for (const name of ["materials.csv", "sections.csv"])
    if (!existsSync(join(dir, name))) copyFileSync(join(environment.assetsPath, "library", name), join(dir, name));
  if (newLibrary) migrateLibrary(dir);
  for (const name of readdirSync(join(environment.assetsPath, "library")).filter((n) =>
    /^(?:materials|sections)-.+\.csv$/i.test(n),
  ))
    if (!existsSync(join(dir, name))) copyFileSync(join(environment.assetsPath, "library", name), join(dir, name));
  return dir;
}
export interface Selection {
  materialID?: string;
  sectionID?: string;
  customSection?: Record<string, string>;
}
export async function rememberSelection(material?: Material, section?: Section) {
  const prev = JSON.parse((await LocalStorage.getItem<string>("selection")) || "{}") as Selection;
  await LocalStorage.setItem(
    "selection",
    JSON.stringify({
      ...prev,
      ...(material ? { materialID: material.id } : {}),
      ...(section ? { sectionID: section.id, customSection: section.raw } : {}),
    }),
  );
}
export function useLibrary() {
  const [library, setLibrary] = useState<Library>(),
    [error, setError] = useState<string>(),
    [selection, setSelection] = useState<Selection>({}),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    initializeRenderer(environment.assetsPath)
      .then(() => {
        if (cancelled) return;
        try {
          setLibrary(loadLibrary(libraryDirectory()));
          setError(undefined);
        } catch (e) {
          setError(String(e));
        }
      })
      .catch((e) => {
        if (!cancelled) setError("Diagram renderer: " + String(e));
      });
    LocalStorage.getItem<string>("selection").then((s) => {
      try {
        setSelection(JSON.parse(s || "{}"));
      } catch {
        setSelection({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version]);
  return { library, error, selection, reload: () => setVersion((v) => v + 1) };
}
export function defaultMaterial(lib: Library, s: Selection) {
  return (
    lib.materials.find((m) => m.id === (s.materialID || preferences().defaultMaterial)) ||
    lib.materials.find((m) => m.id === "C24") ||
    lib.materials[0]
  );
}
export function defaultSection(lib: Library, s: Selection) {
  const match = lib.sections.find((v) => v.id === s.sectionID);
  if (match) return match;
  if (s.customSection) {
    try {
      return sectionFromRow(s.customSection);
    } catch {
      /* A malformed old selection must not break the library. */
    }
  }
  return lib.sections.find((v) => v.id === "Sawn 45x195") || lib.sections[0];
}
export function fmt(n: number, precision = Number(preferences().precision || 3)) {
  if (!Number.isFinite(n)) return "Unavailable";
  if (n !== 0 && (Math.abs(n) >= 1e7 || Math.abs(n) < 0.001)) return n.toExponential(precision);
  return n.toLocaleString("en-GB", { maximumFractionDigits: precision });
}
const imageCache = new Map<string, string>();
export function svgFile(svg: string): string {
  const key = createHash("sha256").update(svg).digest("hex").slice(0, 24);
  const cached = imageCache.get(key);
  if (cached) return cached;
  const dir = join(environment.supportPath, "drawings");
  mkdirSync(dir, { recursive: true });
  const png = pngFromSVG(svg);
  writeFileSync(join(dir, key + ".png"), png);
  const uri = "data:image/png;base64," + png.toString("base64");
  if (imageCache.size > 100) imageCache.clear();
  imageCache.set(key, uri);
  return uri;
}
export function snapshotLibrary() {
  const dir = libraryDirectory();
  return createHash("sha256")
    .update(readFileSync(join(dir, "materials.csv")))
    .update(readFileSync(join(dir, "sections.csv")))
    .digest("hex");
}
export function saveCalculation(kind: string, title: string, input: unknown) {
  const path = join(environment.supportPath, "calculations.json");
  let rows: unknown[] = [];
  if (existsSync(path)) rows = JSON.parse(readFileSync(path, "utf8"));
  rows.unshift({
    kind,
    title,
    date: new Date().toISOString(),
    libraryHash: snapshotLibrary(),
    input,
  });
  writeFileSync(path, JSON.stringify(rows.slice(0, 100), null, 2));
  return path;
}
export function savedCalculations(): {
  kind: string;
  title: string;
  date: string;
  input: any;
}[] {
  const path = join(environment.supportPath, "calculations.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
}
