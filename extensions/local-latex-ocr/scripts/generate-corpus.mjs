import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { corpus } from "../benchmarks/corpus-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "work", "corpus-v1");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const [index, formula] of corpus.entries()) {
  const source = String.raw`\documentclass[preview,border=8pt]{standalone}
\usepackage{amsmath,amssymb}
\begin{document}
\(\displaystyle ${formula.latex}\)
\end{document}
`;
  const texPath = path.join(output, `${formula.id}.tex`);
  await writeFile(texPath, source);
  run("pdflatex", ["-interaction=batchmode", "-halt-on-error", `-output-directory=${output}`, texPath]);
  const pdfPath = path.join(output, `${formula.id}.pdf`);
  const pngPath = path.join(output, `${formula.id}.png`);
  const variant = index % 5;
  const effects =
    variant === 1
      ? ["-negate"]
      : variant === 2
        ? ["-resize", "55%", "-resize", "182%"]
        : variant === 3
          ? ["-blur", "0x0.55"]
          : variant === 4
            ? ["-colorspace", "Gray", "-contrast-stretch", "1%x1%"]
            : [];
  run("magick", ["-density", "180", pdfPath, "-alpha", "remove", "-trim", "+repage", ...effects, pngPath]);
}

await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    corpus.map((entry, index) => ({
      ...entry,
      imagePath: path.join(output, `${entry.id}.png`),
      variant: ["clean", "dark", "low-resolution", "blurred", "low-contrast"][index % 5],
    })),
    null,
    2,
  ),
);
process.stdout.write(`Generated ${corpus.length} formulas in ${output}\n`);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
}
