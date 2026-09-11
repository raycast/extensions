import NeteaseMusicController from "@chyroc/netease-music-controller";
import { controlMusic } from "./util";

export default async () => {
  await controlMusic(async () => {
    await NeteaseMusicController.dislikeTrack();
    await NeteaseMusicController.nextTrack();
  });
};
