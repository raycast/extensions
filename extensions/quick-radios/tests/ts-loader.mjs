import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") && context.parentURL) {
      const parentPath = fileURLToPath(context.parentURL);
      const parentDir = path.dirname(parentPath);
      const targetBase = path.resolve(parentDir, specifier);
      for (const ext of [".ts", ".tsx", ".js", ".json", "/index.ts", "/index.js"]) {
        const candidate = targetBase + ext;
        if (fs.existsSync(candidate)) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}
