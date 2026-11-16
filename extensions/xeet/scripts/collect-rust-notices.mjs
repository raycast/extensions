import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

export function collectRustNotices(cargo, upstream, licenses, env) {
  const metadata = JSON.parse(
    execFileSync(
      cargo,
      ["metadata", "--format-version", "1", "--locked", "--filter-platform", "wasm32-unknown-unknown"],
      { cwd: upstream, env, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    ),
  );
  const nodes = new Map(metadata.resolve.nodes.map((node) => [node.id, node]));
  const used = new Set();
  function visit(id) {
    if (used.has(id)) return;
    used.add(id);
    for (const dependency of nodes.get(id)?.deps || []) {
      if (dependency.dep_kinds.some((kind) => kind.kind !== "dev")) visit(dependency.pkg);
    }
  }
  visit(metadata.packages.find((pkg) => pkg.name === "xeet-wasm").id);
  const chunks = ["License notices for the Xeet WASM dependency graph, including build dependencies.\n"];
  const inventory = [];
  for (const pkg of metadata.packages.filter((pkg) => used.has(pkg.id))) {
    const directory = pkg.name.startsWith("xeet-") ? upstream : dirname(pkg.manifest_path);
    const files = readdirSync(directory).filter((file) =>
      /^(LICENSE|LICENCE|COPYING|NOTICE|COPYRIGHT|UNLICENSE)/i.test(file),
    );
    if (pkg.license_file && !files.includes(pkg.license_file)) files.push(pkg.license_file);
    const texts = [];
    for (const file of files) {
      const path = join(directory, file);
      if (statSync(path).isFile()) texts.push(`${file}\n\n${readFileSync(path, "utf8")}`);
    }
    if (!texts.length) throw new Error(`No license text found for ${pkg.name} ${pkg.version}`);
    inventory.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository });
    chunks.push(
      `\n${"=".repeat(72)}\n${pkg.name} ${pkg.version}\n${pkg.repository || ""}\nLicense: ${pkg.license}\n\n${texts.join("\n\n")}`,
    );
  }
  writeFileSync(join(licenses, "Rust-Dependencies.txt"), chunks.join("\n"));
  writeFileSync(join(licenses, "rust-inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
}
