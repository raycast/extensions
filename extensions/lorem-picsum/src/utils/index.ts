import { PicsumImage } from "@/types";

// Checks if string argument is a valid integer
const isValidInteger = (number: string) => {
  const intValue = parseInt(number, 10);
  return !isNaN(intValue) && intValue == parseFloat(number) && intValue > 0;
};

export const validateArguments = (width: string, height: string = "") => {
  // Check width
  if (!isValidInteger(width)) {
    return false;
  }

  // Check height
  if (height !== "" && !isValidInteger(height)) {
    return false;
  }

  return true;
};

export const resizedImage = ({ width, height, id }: PicsumImage, maxSize: number) => {
  const bigger = width > height ? width : height;
  if (bigger <= maxSize) {
    return `https://picsum.photos/id/${id}/${width}/${height}`;
  }
  const ratio = bigger / maxSize;
  const newWidth = Math.floor(width / ratio);
  const newHeight = Math.floor(height / ratio);
  return `https://picsum.photos/id/${id}/${newWidth}/${newHeight}`;
};
