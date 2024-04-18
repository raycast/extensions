import { LocalStorage } from "@raycast/api";
import { GeneratedImage } from "./types";

const IMAGES_KEY = "IMAGES";

type ImagesMap = Record<GeneratedImage["id"], GeneratedImage>;

const parseImagesFromStorage = async () =>
  LocalStorage.getItem<string>(IMAGES_KEY).then((imagesFromStorage) =>
    imagesFromStorage ? (JSON.parse(imagesFromStorage) as ImagesMap) : null,
  );

export const getImagesFromStore = async () => {
  const imagesMap = await parseImagesFromStorage();
  if (imagesMap) {
    return Object.values(imagesMap);
  }

  return [];
};

export const saveImageToStore = async (image: GeneratedImage) => {
  const imagesFromStore = (await parseImagesFromStorage()) || {};

  imagesFromStore[image.id] = image;

  await LocalStorage.setItem(IMAGES_KEY, JSON.stringify(imagesFromStore));
};
