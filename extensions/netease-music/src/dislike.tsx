import { controlMusic } from "./util";
import NeteaseMusicController from "@chyroc/netease-music-controller";

export default async () => {
  await controlMusic(NeteaseMusicController.dislikeTrack);
};
