import { getPreferenceValues } from "@raycast/api";
import type { Species, SpeciesImages, SpeciesImagesFlowerInner } from "@/api";
import { Configuration } from "@/api";

export const getShowAs = (): "grid" | "list" => getPreferenceValues<Preferences>().showAs ?? "grid";

export const getImageSections = (species?: Species) => {
  const images = species?.images || {};
  const sections = ["flower", "leaf", "habit", "fruit", "bark", "other"];
  const imgSections = sections
    .map((key) => {
      if (typeof images[key as keyof SpeciesImages] !== "undefined" && images[key as keyof SpeciesImages]!.length > 0) {
        return {
          title: key.charAt(0).toUpperCase() + key.slice(1),
          images: images[key as keyof SpeciesImages]!,
        };
      }
      return null;
    })
    .filter((section) => section !== null) as { title: string; images: SpeciesImagesFlowerInner[] }[];

  return imgSections;
};

export const getConfiguration = (): Configuration => {
  const accessToken = getPreferenceValues<Preferences>().accessToken;
  return new Configuration({
    apiKey: accessToken,
  });
};
