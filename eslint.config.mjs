import { createRequire } from "module";
const require = createRequire(import.meta.url);
const eslintConfig = require("@raycast/eslint-config");

export default [...eslintConfig];
