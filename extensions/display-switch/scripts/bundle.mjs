import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

if (!existsSync("dist/package.json")) throw new Error("Run npm run build first.");
execFileSync("/usr/bin/ditto", ["-c", "-k", "--keepParent", "dist", "display-switch.zip"], { stdio: "inherit" });
const hash = createHash("sha256").update(readFileSync("display-switch.zip")).digest("hex");
writeFileSync("display-switch.zip.sha256", `${hash}  display-switch.zip\n`);
console.log(`Created display-switch.zip (${hash})`);
