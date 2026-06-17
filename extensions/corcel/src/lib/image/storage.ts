import { LocalStorage } from "@raycast/api";
import { GeneratedImage } from "./types";

const IMAGES_KEY = "IMAGES";

type ImagesMap = Record<GeneratedImage["id"], GeneratedImage>;

const parseImagesFromStorage = async () =>
  LocalStorage.getItem<string>(IMAGES_KEY).then((imagesFromStorage) =>
    imagesFromStorage ? (JSON.parse(imagesFromStorage) as ImagesMap) : {},
  );

export const getImagesFromStore = async () => {
  const imagesMap = await parseImagesFromStorage();

  return Object.values(imagesMap).sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());
};

export const saveImageToStore = async (image: GeneratedImage) => {
  const parsedImages = await parseImagesFromStorage();

  const imagesFromStore = { ...parsedImages };

  imagesFromStore[image.id] = image;

  await LocalStorage.setItem(IMAGES_KEY, JSON.stringify(imagesFromStore));
};

export const saveImagesToStore = async (images: GeneratedImage[]) => {
  const parsedImages = await parseImagesFromStorage();

  const imagesFromStore = { ...parsedImages };

  images.forEach((image) => {
    imagesFromStore[image.id] = image;
  });

  return await LocalStorage.setItem(IMAGES_KEY, JSON.stringify(imagesFromStore));
};
