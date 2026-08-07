import { File } from "../types";

export function isFavorite(file: File): boolean {
  return typeof file.attributes.favorite === "number";
}

/** Every favorite, ordered by its position. */
export function getFavorites(files: File[]): File[] {
  return files.filter(isFavorite).sort((a, b) => (a.attributes.favorite as number) - (b.attributes.favorite as number));
}

function withFavorite(file: File, favorite: number | null): File {
  return { ...file, attributes: { ...file.attributes, favorite } };
}

/**
 * Numbers favorites from 1 following the given order, and returns only those
 * whose position actually changed — every returned file has to be written back
 * to disk.
 */
function renumber(ordered: File[]): File[] {
  return ordered
    .map((file, index) => withFavorite(file, index + 1))
    .filter((file, index) => ordered[index].attributes.favorite !== file.attributes.favorite);
}

export function addToFavorites(files: File[], file: File): File[] {
  return renumber([...getFavorites(files), file]);
}

export function removeFromFavorites(files: File[], file: File): File[] {
  const others = getFavorites(files).filter((favorite) => favorite.fullPath !== file.fullPath);
  return [withFavorite(file, null), ...renumber(others)];
}

/** Moves a favorite by `offset` places, returning the files to write back. */
export function moveFavorite(files: File[], file: File, offset: number): File[] {
  const ordered = getFavorites(files);
  const index = ordered.findIndex((favorite) => favorite.fullPath === file.fullPath);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= ordered.length) return [];

  const moved = [...ordered];
  moved.splice(target, 0, ...moved.splice(index, 1));
  return renumber(moved);
}
