import { controlMusic } from "./util";
import NeteaseMusicController, { NeteaseMusic } from "@chyroc/netease-music-controller";

export default async () => {
  const state = await NeteaseMusicController.getPlayState();
  if (state === NeteaseMusic.PlayState.Playing) {
    await controlMusic(NeteaseMusicController.pause);
  } else if (state === NeteaseMusic.PlayState.Paused) {
    await controlMusic(NeteaseMusicController.play);
  } else if (state === NeteaseMusic.PlayState.Exit) {
    throw new Error("Netease Music is not running.");
  } else {
    throw new Error("Unknown play state.");
  }
};
