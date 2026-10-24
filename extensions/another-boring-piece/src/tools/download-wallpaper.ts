import { downloadWallpaper, type Wallpaper } from "../utils";

type Input = {
  /** The complete wallpaper object returned by a browsing or history tool. */
  wallpaper: Wallpaper;
};

export default async function tool(input: Input) {
  const downloadPath = await downloadWallpaper(input.wallpaper);
  return { status: "downloaded", wallpaper: input.wallpaper, downloadPath };
}
