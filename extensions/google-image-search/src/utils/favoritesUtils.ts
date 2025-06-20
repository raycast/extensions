import { LocalStorage } from "@raycast/api";
import { GoogleImageResult } from "../types";

const FAVORITES_KEY = "favorite-images";

/**
 * Get all favorite images from LocalStorage
 */
export async function getFavoriteImages(): Promise<GoogleImageResult[]> {
  const favoritesJSON = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return favoritesJSON ? JSON.parse(favoritesJSON) : [];
}

/**
 * Add an image to favorites
 */
export async function addToFavorites(image: GoogleImageResult): Promise<void> {
  const favorites = await getFavoriteImages();

  // Check if image already exists in favorites
  const exists = favorites.some((favorite) => favorite.link === image.link);
  if (exists) return;

  const updatedFavorites = [...favorites, image];
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
}

/**
 * Remove an image from favorites
 */
export async function removeFromFavorites(imageLink: string): Promise<void> {
  const favorites = await getFavoriteImages();
  const updatedFavorites = favorites.filter((favorite) => favorite.link !== imageLink);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
}

/**
 * Check if an image is in favorites
 */
export async function isImageFavorite(imageLink: string): Promise<boolean> {
  const favorites = await getFavoriteImages();
  return favorites.some((favorite) => favorite.link === imageLink);
}
