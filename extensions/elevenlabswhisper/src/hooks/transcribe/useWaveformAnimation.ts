import { useEffect, useMemo, useState } from "react";
import { renderSyntheticWave } from "../../utils/waveform";

export const useWaveformAnimation = (isRecording: boolean) => {
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setSeed(0);
      return;
    }

    const interval = setInterval(() => {
      setSeed((current) => current + 1);
    }, 150);

    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  const markdown = useMemo(() => renderSyntheticWave(seed), [seed]);

  return markdown;
};
