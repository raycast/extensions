#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const outdir = path.join(__dirname, "dist");
const esbuildBin = path.join(__dirname, "node_modules/esbuild/bin/esbuild");

// Clean dist directory
if (fs.existsSync(outdir)) {
  fs.rmSync(outdir, { recursive: true });
}
fs.mkdirSync(outdir, { recursive: true });

// Commands to build
const commands = ["track", "status", "report"];

console.log("Building Raycast extension with esbuild 0.25.12...\n");
console.log(`Using esbuild: ${esbuildBin}\n`);

for (const command of commands) {
  const entryPoint = path.join(__dirname, "src", `${command}.tsx`);
  const outfile = path.join(outdir, `${command}.js`);

  console.log(`Building ${command}.tsx...`);

  try {
    const cmd = `"${esbuildBin}" "${entryPoint}" --bundle --platform=node --target=node16 --outfile="${outfile}" --format=cjs --jsx=automatic --jsx-import-source=react --external:@raycast/api --external:@raycast/utils --external:react --external:react/jsx-runtime`;

    execSync(cmd, { stdio: "inherit" });
    console.log(`✓ ${command}.tsx built successfully\n`);
  } catch (error) {
    console.error(`✗ Failed to build ${command}.tsx`);
    process.exit(1);
  }
}

console.log("Build completed successfully!");
console.log(`Output directory: ${outdir}`);
