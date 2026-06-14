import { convertFinderMediaTo } from "./convert-media";

export default async function Command() {
  await convertFinderMediaTo("mp3", "MP3");
}
