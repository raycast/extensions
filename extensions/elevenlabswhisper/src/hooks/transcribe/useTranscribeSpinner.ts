import { useEffect, useMemo, useState } from "react";
import { renderTranscribeSpinner } from "../../utils/transcribeSpinner";

export const useTranscribeSpinner = (isTranscribing: boolean) => {
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (!isTranscribing) {
      setSeed(0);
      return;
    }

    const interval = setInterval(() => {
      setSeed((current) => current + 1);
    }, 200); // 200ms for smoother spinner rotation

    return () => {
      clearInterval(interval);
    };
  }, [isTranscribing]);

  const markdown = useMemo(() => renderTranscribeSpinner(seed), [seed]);

  return markdown;
};
