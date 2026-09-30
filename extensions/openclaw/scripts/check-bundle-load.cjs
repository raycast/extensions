const Module = require("node:module");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const originalLoad = Module._load;
const raycastStub = new Proxy(function () {}, {
  get: () => raycastStub,
  apply: () => raycastStub,
});

Module._load = function loadWithRaycastStub(request, parent, isMain) {
  if (request === "@raycast/api") return raycastStub;
  if (request === "react" || request === "react/jsx-runtime") {
    return raycastStub;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const commands = [
  "control-center",
  "ask",
  "chat",
  "clipboard",
  "selected-text",
  "status",
  "open-webchat",
];

const isolatedDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "openclaw-raycast-bundle-"),
);

try {
  for (const command of commands) {
    const bundle = `${command}.js`;
    fs.copyFileSync(
      path.join(process.cwd(), "dist", bundle),
      path.join(isolatedDirectory, bundle),
    );
    require(path.join(isolatedDirectory, bundle));
  }
} finally {
  fs.rmSync(isolatedDirectory, { recursive: true, force: true });
}

console.log(
  `Loaded ${commands.length} isolated Raycast bundles without module errors.`,
);
