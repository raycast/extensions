import { parseArgs } from "node:util";
import path from "node:path";
import { pinCompanionRelease } from "./companion-release-artifacts";

// Pin the release artifact. Firefox remains the cryptographic signature verifier.
function main() {
  const { values } = parseArgs({
    options: { xpi: { type: "string" }, url: { type: "string" }, browser: { type: "string", default: "firefox" } },
  });
  if (values.browser !== "firefox" && values.browser !== "zen") throw new Error("Unknown companion browser");
  if (!values.xpi || !values.url)
    throw new Error("Usage: npm run configure:firefox-release -- --xpi <signed.xpi> --url <https://.../signed.xpi>");
  const companion = pinCompanionRelease(path.resolve(__dirname, ".."), path.resolve(values.xpi), values.url);
  console.log(`Configured Firefox companion ${companion.version} with SHA-256 ${companion.sha256}`);
  console.log(
    "Firefox must still verify Mozilla's cryptographic signature during installation. Rebuild App Hopper after configuring the release.",
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
