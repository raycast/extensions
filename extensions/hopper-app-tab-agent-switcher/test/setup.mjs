// Loaded by `npm test` (--import). Source files import siblings without an extension ("./model"), which
// esbuild resolves for Raycast; Node's type stripping needs "./model.ts". Retry unresolved relative imports
// with ".ts".
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !relative || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
