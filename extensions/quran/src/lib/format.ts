import type { IndexedAyah } from "./types";

export function formatAyah(ayah: IndexedAyah): string {
  return `${ayah.text}\n\n— ${ayah.surah_name} - ${ayah.ayah_id}\n\n`;
}
