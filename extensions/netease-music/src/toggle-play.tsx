import NeteaseMusicController, { NeteaseMusic } from "@chyroc/netease-music-controller";
import { controlMusic } from "./util";

export default async () => {
  await controlMusic(async () => {
    const state = await NeteaseMusicController.getPlayState();
    if (state === NeteaseMusic.PlayState.Playing) {
      await NeteaseMusicController.pause();
    } else {
      await NeteaseMusicController.play();
    }
  });
};
