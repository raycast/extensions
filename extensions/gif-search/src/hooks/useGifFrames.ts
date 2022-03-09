import { useState } from "react";
import { useInterval } from "usehooks-ts";

interface GifFrameState {
  currentFrame?: string;
}

export function useGifFrames(currentFrame: number, frames: string[], frameRate: number) {
  const [count, setCount] = useState(currentFrame);
  const [state, setState] = useState<GifFrameState>({});

  const frameCount = frames.length;
  useInterval(() => {
    let curFrame = count;
    if (curFrame >= frameCount - 1) {
      curFrame = 0;
    } else {
      curFrame++;
    }

    const frame = frames[curFrame];
    setState({ currentFrame: frame });
    setCount(curFrame);
  }, frameRate);

  return state;
}
