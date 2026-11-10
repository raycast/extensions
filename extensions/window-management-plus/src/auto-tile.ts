import { rows } from "./lib/layouts";
import { prefs, tile } from "./lib/raycast";

export default () => tile(rows(2, prefs().gap));
