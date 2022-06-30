import resizeImg from "resize-image-buffer";

type Size = {
  width: number;
  height: number;
};

enum ImageType {
  NONE = "",
  JPEG = "JPEG",
  PNG = "tdta",
}

const imageTypeFromString = (imageType: string): ImageType => {
  return imageType === "JPEG" ? ImageType.JPEG : imageType === "tdta" ? ImageType.PNG : ImageType.NONE;
};

export const parseImageStream = async (data: string, size?: Size): Promise<string> => {
  const image_type = imageTypeFromString(data.slice(6, 10));
  if (image_type === ImageType.NONE) {
    console.warn("Unsupported image type: " + image_type);
    return "";
  }
  try {
    const buffer_type = image_type === ImageType.JPEG ? "image/jpeg" : "image/png";
    const binary = data.split(image_type)[1].slice(0, -1);
    let image = Buffer.from(binary, "hex");
    if (size) {
      image = await resizeImg(image, size);
    }
    return `data:${buffer_type};base64,${image.toString("base64")}`;
  } catch (err: any) {
    console.error(err.message);
    return "";
  }
};
