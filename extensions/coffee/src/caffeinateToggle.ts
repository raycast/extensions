import { execSync } from "child_process";
import { startCaffeinate, stopCaffeinate } from "./utils";

export default async () => {
  try {
    execSync("ps aux | pgrep caffeinate");

    await stopCaffeinate(true, "Your Mac is now deffeinated");
  } catch (error) {
    await startCaffeinate(true, "Your Mac is now caffeinated");
  }
};
