import { appendFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { companionReleasePlan } from "./companion-release-plan";
import { prepareCompanionRelease } from "./companion-release-artifacts";

async function main() {
  const manifest = JSON.parse(readFileSync("companion/manifest.json", "utf8"));
  if (manifest.browser_specific_settings?.gecko?.id !== "app-hopper-firefox@chenghsj") {
    throw new Error("Unexpected shared companion identity");
  }
  const config = JSON.parse(readFileSync("assets/companion-integration.json", "utf8"));
  const dryRun = process.env.DRY_RUN === "true";
  const plan = companionReleasePlan(
    manifest.version,
    config.companion?.version,
    dryRun || process.argv[2] === "verify-download",
  );
  if (process.argv[2] === "verify-download") {
    const response = await fetch(plan.url);
    if (!response.ok) throw new Error(`Public download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== config.companion.sha256) throw new Error("Published XPI checksum differs from configured release");
    console.log("Anonymous public download matches the signed release checksum.");
    return;
  }
  if (process.argv[2] === "plan") {
    if (!dryRun) {
      const response = await fetch(`https://api.github.com/repos/chenghsj/app-hopper/releases/tags/${plan.tag}`);
      if (response.status !== 404) {
        throw new Error(
          response.ok
            ? "Release already exists; refusing to replace its assets"
            : `Release lookup failed: HTTP ${response.status}`,
        );
      }
    }
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        Object.entries(plan)
          .map(([key, value]) => `${key}=${value}\n`)
          .join(""),
      );
    }
    console.log(`${dryRun ? "Build-only validation" : "Release candidate"}: ${plan.tag}`);
    return;
  }
  if (process.argv[2] !== "prepare" || dryRun)
    throw new Error("Expected plan or prepare; prepare requires a signing run");
  prepareCompanionRelease(process.cwd(), plan, process.env.PUBLISH_RELEASE === "true");
  console.log(`Prepared ${plan.tag}; XPI identity, contents and signature metadata match the release build.`);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
