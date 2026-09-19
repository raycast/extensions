// Generates src/blip/descriptor.json from the proto/ folder.
// The .proto files describe Blip's local RPC (see README, "How it talks to Blip").
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "frontend/cmd/libblip/rpc/service.proto",
  "frontend/state.proto",
  "frontend/event/event.proto",
  "google/protobuf/any.proto",
];
const out = path.join(root, "src/blip/descriptor.json");
execFileSync(
  "npx",
  ["pbjs", "-t", "json", "--keep-case", "-p", path.join(root, "proto"), "-o", out, ...files],
  { cwd: root, stdio: "inherit" },
);
console.log("wrote", out);

