import { convertFinderMediaTo } from "./convert-media";

export default async function Command() {
  await convertFinderMediaTo("mp4", "MP4");
}
