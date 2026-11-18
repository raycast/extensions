import { setDesktopWallpaper, type Wallpaper } from "../utils";

type Input = {
  /** The complete wallpaper object returned by a browsing or history tool. */
  wallpaper: Wallpaper;
};

export default async function tool(input: Input) {
  await setDesktopWallpaper(input.wallpaper);
  return { status: "selected", wallpaper: input.wallpaper };
}
