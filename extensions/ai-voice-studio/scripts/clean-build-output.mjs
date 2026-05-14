import fs from "node:fs";
import path from "node:path";

const outputDir = path.join(process.cwd(), "dist");
fs.rmSync(outputDir, { recursive: true, force: true });
