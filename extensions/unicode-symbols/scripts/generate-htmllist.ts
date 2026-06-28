import { writeFile } from "fs/promises";
import path from "path";

const run = async () => {
  const data = (await (await fetch("https://html.spec.whatwg.org/entities.json")).json()) as Record<
    string,
    { codepoints: number[]; characters: string }
  >;
  const filtered = Object.entries(data).filter(([key, value]) => key.endsWith(";") && value.codepoints.length === 1);
  const list = filtered
    .map(([key, value]) => ({ key, value }))
    .map(({ key, value }) => ({ code: value.codepoints[0], value: key }))
    .sort((a, b) => a.code - b.code);
  const output = { html_entities: list };

  const datasetOutputPath = path.resolve(__dirname, `../assets/html.json`);

  await writeFile(datasetOutputPath, JSON.stringify(output));
};

(async () => {
  await run();
})();
