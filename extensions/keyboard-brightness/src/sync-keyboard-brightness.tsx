import { LocalStorage } from "@raycast/api";
import { GetBrightness } from "./types";
import executeCommand from "./utils";

const Command = async () => {
  const { stdout } = await executeCommand(["get"]);
  const { brightness } = JSON.parse(stdout) as GetBrightness;
  await LocalStorage.setItem("brightness", brightness);
};

export default Command;
