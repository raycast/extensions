import { createRequire } from "module";
const require = createRequire(import.meta.url);
const raycastConfig = require("@raycast/eslint-config");

export default raycastConfig.flat(Infinity);
