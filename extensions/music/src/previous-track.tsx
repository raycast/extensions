import { closeMainWindow } from "@raycast/api";
import * as music from "./util/scripts";

export default async () => {
  await closeMainWindow();
  await music.player.previous();
};
