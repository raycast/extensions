import { LocalStorage } from "@raycast/api";
import { exec } from "child_process";

export default async () => {
  LocalStorage.removeItem("isPlaying");
  exec("/usr/bin/killall afplay");
};
