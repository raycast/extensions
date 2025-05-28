import { execSync } from "child_process";
import { startCaffeinate, stopCaffeinate } from "./utils";

export default async () => {
  try {
    execSync("pgrep caffeinate");

    await stopCaffeinate({ menubar: true, status: true }, "Your Mac now has Club Mate");
  } catch (error) {
    await startCaffeinate({ menubar: true, status: true }, "Your Mac now has Club Mate");
  }
};
