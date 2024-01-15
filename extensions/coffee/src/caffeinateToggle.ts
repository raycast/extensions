import { execSync } from "child_process";
import { startCaffeinate, stopCaffeinate } from "./utils";

export default async () => {
  try {
    execSync("pgrep caffeinate");

    await stopCaffeinate({ menubar: true, status: true }, "Your Mac is now decaffeinated");
  } catch (error) {
    await startCaffeinate({ menubar: true, status: true }, "Your Mac is now caffeinated");
  }
};
