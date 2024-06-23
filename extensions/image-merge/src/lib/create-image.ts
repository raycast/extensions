import path from "node:path";
import { execSync } from "node:child_process";
import { cpus } from "node:os";

const convertPath = cpus()[0].model.includes("Apple") ? "/opt/homebrew/bin/convert" : "/usr/local/bin/convert";

export const createImage = async (locations: string[], direction: "vertical" | "horizontal"): Promise<void> => {
  const now = new Date();
  const outputDir = path.dirname(locations[0]);
  const outputName = `image-merge-${direction}-${now.getTime()}.jpg`;
  const append = direction === "vertical" ? "-append" : "+append";
  const splice = direction === "vertical" ? "0x20" : "20x0";
  const chop = direction === "vertical" ? "0x20" : "20x0";
  const args = [
    locations.join(" "),
    "-background white",
    "-splice",
    splice,
    append,
    "-chop",
    chop,
    path.join(outputDir, outputName),
  ].join(" ");
  execSync(`${convertPath} ${args}`);
};
