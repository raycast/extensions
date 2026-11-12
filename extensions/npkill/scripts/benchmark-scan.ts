import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { scan } from "../src/services/scan-manager";

async function main() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "npkill-benchmark-")));
  const count = 5000;
  try {
    for (let offset = 0; offset < count; offset += 100) {
      await Promise.all(
        Array.from({ length: 100 }, async (_, i) => {
          const project = join(root, `project-${offset + i}`);
          await mkdir(join(project, "node_modules"), { recursive: true });
          await writeFile(join(project, "package.json"), "{}");
        }),
      );
    }
    const started = performance.now();
    let first: number | undefined;
    let found = 0;
    const warnings: string[] = [];
    const result = await scan(
      {
        root,
        profiles: "node",
        executable: resolve("node_modules/.bin/npkill"),
        config: "",
        exclusions: "",
        includeSensitive: false,
      },
      AbortSignal.timeout(120000),
      {
        onRoot: () => {},
        onArtifact: () => {
          first ??= performance.now() - started;
          found++;
        },
        onWarning: (message) => warnings.push(message),
      },
    );
    console.log(
      JSON.stringify(
        {
          result,
          expected: count,
          found,
          firstResultMs: Math.round(first ?? 0),
          durationMs: Math.round(performance.now() - started),
          warnings: warnings.length,
        },
        null,
        2,
      ),
    );
    if (result !== "complete" || found !== count || warnings.length) process.exitCode = 1;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
