import { mkdir, mkdtemp, realpath, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "npkill-demo-")));
  const projects = [
    { name: "dashboard-prototype", target: "node_modules", marker: "package.json", mb: 12, days: 184 },
    { name: "marketing-website", target: ".next", marker: "package.json", mb: 8, days: 42 },
    { name: "python-experiments", target: ".venv", marker: "pyproject.toml", mb: 6, days: 120 },
    { name: "rust-command-line", target: "target", marker: "Cargo.toml", mb: 4, days: 8 },
    { name: "雪 playground", target: "node_modules", marker: "package.json", mb: 2, days: 95 },
  ];
  for (const project of projects) {
    const directory = join(root, project.name);
    const target = join(directory, project.target);
    await mkdir(target, { recursive: true });
    await writeFile(
      join(directory, project.marker),
      project.marker === "package.json" ? "{}" : "# Disposable demo fixture",
    );
    await writeFile(join(target, "disposable-fixture.bin"), Buffer.alloc(project.mb * 1024 * 1024, 65));
    if (project.target === ".venv") await writeFile(join(target, "pyvenv.cfg"), "home = /usr/bin");
    if (project.target === ".next") await writeFile(join(target, "BUILD_ID"), "demo");
    const date = new Date(Date.now() - project.days * 86400000);
    await utimes(join(directory, project.marker), date, date);
  }
  console.log(root);
}
void main();
