import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const helper = join(root, "assets/bin/mouse-scroll-helper");

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === ".build" ? [] : filesUnder(path);
      return [path];
    })
    .sort();
}

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { encoding: "utf8" });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function line(output, name) {
  return output.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim() ?? null;
}

const inspection = run("/usr/bin/codesign", ["-dv", "--verbose=4", helper]);
const strict = run("/usr/bin/codesign", ["--verify", "--strict", "--verbose=2", helper]);
const teamIdentifier = line(inspection.output, "TeamIdentifier");
const authority = inspection.output.match(/^Authority=(.+)$/m)?.[1] ?? null;
const nativeSources = filesUnder(join(root, "native/MouseScrollHelper")).map((path) => ({
  path: relative(root, path),
  sha256: sha256(path),
}));

const manifest = {
  command: packageJson.commands[0]?.name ?? null,
  commandTitle: packageJson.commands[0]?.title ?? null,
  helper: {
    architectures: run("/usr/bin/lipo", ["-archs", helper]).output.trim().split(/\s+/).sort(),
    sha256: sha256(helper),
    signature: {
      authority,
      strictVerified: strict.ok,
      teamIdentifier,
      notarizationEvidence: "not_provided",
      storeSigned:
        strict.ok &&
        Boolean(authority?.startsWith("Developer ID Application:")) &&
        Boolean(teamIdentifier && teamIdentifier !== "not set"),
    },
  },
  icon: { path: packageJson.icon, sha256: sha256(join(root, "assets", packageJson.icon)) },
  nativeSources,
  package: { sha256: sha256(join(root, "package.json")) },
  publicTitle: packageJson.title,
  slug: packageJson.name,
  toolchain: {
    raycastApi: packageJson.dependencies["@raycast/api"],
    raycastEslintConfig: packageJson.devDependencies["@raycast/eslint-config"],
    typescript: packageJson.devDependencies.typescript,
  },
};

const prettierConfig = (await prettier.resolveConfig(join(root, "package.json"))) ?? {};
process.stdout.write(await prettier.format(JSON.stringify(manifest), { ...prettierConfig, parser: "json" }));
