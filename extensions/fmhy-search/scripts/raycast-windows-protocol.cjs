const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");

const raycastApiDist = path.join(process.cwd(), "node_modules", "@raycast", "api", "dist").toLowerCase();
const originalLoader = Module._extensions[".js"];

Module._extensions[".js"] = function loadRaycastModule(module, filename) {
  const normalizedFilename = path.normalize(filename).toLowerCase();
  if (!normalizedFilename.startsWith(raycastApiDist)) {
    return originalLoader(module, filename);
  }

  const source = fs
    .readFileSync(filename, "utf8")
    .replace(/scheme:"raycast-x"/g, 'scheme:"raycast"');

  return module._compile(source, filename);
};
