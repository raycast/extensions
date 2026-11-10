import { rotate } from "./lib/layouts";
import { permute } from "./lib/raycast";

export default () => permute(rotate(1));
