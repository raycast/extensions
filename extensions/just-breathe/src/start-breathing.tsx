import { Detail, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { resolve } from "path";
import { useState } from "react";
import useInterval from "use-interval";

const FRAMES_COUNT = 16;
const FRAME_DELAY = 1000;

export default function Command() {
  const [frameIndex, setFrameIndex] = useState(0);

  useInterval(() => {
    setFrameIndex((prevIndex) => (prevIndex + 1) % FRAMES_COUNT);
  }, FRAME_DELAY);

  const frame = getFrame(frameIndex);

  const text = `
Starting square breathing 🪷\n
Such cycles should be repeated for 1-3 minutes, but preferably 4-5 minutes. This technique is designed to help you relax after a long day, or before/after a challenging task or conversation.
`;

  return <Detail markdown={`\`\`\`\n${frame}\n\`\`\`\n${text}`} />;
}

const frameCache = new Map<number, string>();

function getFrame(index: number) {
  if (frameCache.has(index)) {
    return frameCache.get(index)!;
  }

  const file = resolve(environment.assetsPath, "frames", `${index}.txt`);
  const data = readFileSync(file, "utf8");
  const adjustedData = environment.textSize === "large" ? reduceWhitespace(data) : data;
  frameCache.set(index, adjustedData);
  return adjustedData;
}

function reduceWhitespace(text: string): string {
  const lines = text.split("\n");
  const reducedLines = lines.map((line) => {
    return line.replace(/^ {0,6}/, "");
  });
  return reducedLines.join("\n");
}
