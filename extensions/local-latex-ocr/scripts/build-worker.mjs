import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDirectory = path.join(root, "assets", "runtime");
const ortDirectory = path.join(root, "node_modules", "onnxruntime-web", "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [path.join(root, "src", "worker.ts")],
  outfile: path.join(outputDirectory, "worker.cjs"),
  bundle: true,
  minify: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  sourcemap: false,
  external: ["onnxruntime-node"],
});

for (const name of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  await copyFile(path.join(ortDirectory, name), path.join(outputDirectory, name));
}

const nativeModules = path.join(outputDirectory, "node_modules");
const nativePackage = path.join(root, "node_modules", "onnxruntime-node");
const nativeOutput = path.join(nativeModules, "onnxruntime-node");
await mkdir(path.join(nativeOutput, "bin", "napi-v6", "darwin", "arm64"), { recursive: true });
await cp(path.join(nativePackage, "dist"), path.join(nativeOutput, "dist"), { recursive: true });
await copyFile(path.join(nativePackage, "package.json"), path.join(nativeOutput, "package.json"));
for (const name of ["onnxruntime_binding.node", "libonnxruntime.1.dylib"]) {
  await copyFile(
    path.join(nativePackage, "bin", "napi-v6", "darwin", "arm64", name),
    path.join(nativeOutput, "bin", "napi-v6", "darwin", "arm64", name),
  );
}
const commonPackage = path.join(root, "node_modules", "onnxruntime-common");
const commonOutput = path.join(nativeModules, "onnxruntime-common");
await cp(path.join(commonPackage, "dist"), path.join(commonOutput, "dist"), { recursive: true });
await copyFile(path.join(commonPackage, "package.json"), path.join(commonOutput, "package.json"));
