import { runAppleScript } from "run-applescript";
import Caffeinate from "./caffeinate";
import Decaffinate from "./decaffeinate";

const ToggleCaffeinate = async () => {
  try {
    await runAppleScript(`do shell script "pgrep caffeinate"`);
    await Decaffinate();
  } catch (_) {
    await Caffeinate();
  }
};

export default ToggleCaffeinate;
