import { LocalStorage } from "@raycast/api";

// Default category set. Each category has a short code (typed after a single dash,
// e.g. "-d") and a list of file extensions (lowercase, no dot). Editable in Manage
// Tools; DEFAULT_CATEGORIES stays as the restorable baseline.
export interface Category {
  name: string;
  code: string;
  extensions: string[];
}

const KEY = "categories";

function cloneDefaults(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c, extensions: [...c.extensions] }));
}

export async function getCategories(): Promise<Category[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return cloneDefaults();
  try {
    return JSON.parse(raw) as Category[];
  } catch {
    return cloneDefaults();
  }
}

export async function saveCategories(list: Category[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(list));
}

export async function resetCategories(): Promise<Category[]> {
  const defaults = cloneDefaults();
  await saveCategories(defaults);
  return defaults;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Documents", code: "d", extensions: ["pdf", "doc", "docx", "pages", "txt", "md", "rtf", "odt"] },
  { name: "Audio", code: "a", extensions: ["wav", "mp3", "flac", "aiff", "aif", "m4a", "ogg", "aac"] },
  { name: "Video", code: "v", extensions: ["mp4", "mov", "mkv", "avi", "webm", "m4v"] },
  { name: "Images", code: "i", extensions: ["png", "jpg", "jpeg", "heic", "webp", "tiff", "tif", "gif", "bmp"] },
  { name: "3D", code: "3", extensions: ["obj", "fbx", "stl", "blend", "glb", "gltf", "step", "stp", "3mf"] },
  { name: "Vector", code: "vec", extensions: ["svg", "ai", "eps", "cdr"] },
];

// Union of extensions for the given category codes. Unknown codes contribute nothing.
export function extensionsForCodes(codes: string[], categories: Category[] = DEFAULT_CATEGORIES): string[] {
  const set = new Set<string>();
  for (const code of codes) {
    const cat = categories.find((c) => c.code === code);
    if (cat) cat.extensions.forEach((e) => set.add(e));
  }
  return [...set];
}
