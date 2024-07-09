import { convertImages, ImageType } from "./utils";

export default async function main() {
  await convertImages(ImageType.PNG);
}
