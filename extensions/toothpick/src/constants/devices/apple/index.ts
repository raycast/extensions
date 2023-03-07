import airpods from "./airpods";
import beats from "./beats";
import magicKeyboard from "./magic-keyboard";
import magicMouse from "./magic-mouse";
import magicTrackpad from "./magic-trackpad";

const devices: Record<string, Record<string, string>> = {
  ...airpods,
  ...beats,
  ...magicKeyboard,
  ...magicMouse,
  ...magicTrackpad,
};

export default devices;
