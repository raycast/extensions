import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./raycast-stub-loader.mjs", pathToFileURL("./test/"));
