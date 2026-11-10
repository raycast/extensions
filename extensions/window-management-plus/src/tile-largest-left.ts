import { focus } from "./lib/layouts";
import { prefs, tile } from "./lib/raycast";

export default () => tile(focus({ mainOn: "left", gap: prefs().gap }));
