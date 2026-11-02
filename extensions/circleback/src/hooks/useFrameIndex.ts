import { useEffect, useState } from "react";

const FRAME_INTERVAL_MS = 50;

export const useFrameIndex = (isAnimating: boolean) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => setFrameIndex((current) => current + 1), FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAnimating]);

  return frameIndex;
};
