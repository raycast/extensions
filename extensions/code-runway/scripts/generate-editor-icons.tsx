import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AntigravityMono from "@lobehub/icons/es/Antigravity/components/Mono";
import CursorMono from "@lobehub/icons/es/Cursor/components/Mono";
import WindsurfMono from "@lobehub/icons/es/Windsurf/components/Mono";

const OUTPUTS = [
  { path: "assets/editor-antigravity.svg", Component: AntigravityMono },
  { path: "assets/editor-cursor.svg", Component: CursorMono },
  { path: "assets/editor-windsurf.svg", Component: WindsurfMono },
] as const;

async function writeSvgAsset(outputPath: string, Component: (props: { size: number }) => React.ReactNode) {
  const absolutePath = resolve(process.cwd(), outputPath);
  const svg = renderToStaticMarkup(createElement(Component, { size: 20 })).replace(
    "<svg",
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"',
  );

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, svg, "utf8");
  console.log(`Wrote ${outputPath}`);
}

async function main() {
  for (const output of OUTPUTS) {
    await writeSvgAsset(output.path, output.Component);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
