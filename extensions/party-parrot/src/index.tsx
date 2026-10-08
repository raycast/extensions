import { Detail, environment } from "@raycast/api";
import { readFileSync } from "fs";
import { resolve } from "path";
import { useState } from "react";
import useInterval from "use-interval";

const FRAMES_COUNT = 9;
const FRAME_DELAY = 100;

export default function Command() {
  const [frameIndex, setFrameIndex] = useState(0);

  useInterval(() => {
    setFrameIndex((prevIndex) => (prevIndex + 1) % FRAMES_COUNT);
  }, FRAME_DELAY);

  const frame = getFrame(frameIndex);

  return <Detail markdown={`\`\`\`\n\n\n${frame}\n\n\`\`\``} />;
}

const frameCache = new Map<number, string>([]);

function getFrame(index: number) {
  const cachedFrame = frameCache.get(index);
  if (cachedFrame) {
    return cachedFrame;
  }

  const file = resolve(environment.assetsPath, "frames", `${index}.txt`);
  const data = readFileSync(file);
  const frame = data.toString();
  frameCache.set(index, frame);
  return frame;
}
