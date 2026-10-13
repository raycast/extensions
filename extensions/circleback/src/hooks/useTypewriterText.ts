import { useEffect, useState } from "react";

const TICK_INTERVAL_MS = 50;
const CATCH_UP_DURATION_MS = 1500;

export const useTypewriterText = (text: string, key: string | undefined) => {
  const [typed, setTyped] = useState({ key, length: 0 });
  const length = typed.key === key ? typed.length : 0;

  useEffect(() => {
    if (length >= text.length) return;
    const charactersPerTick = Math.max(1, Math.ceil(text.length / (CATCH_UP_DURATION_MS / TICK_INTERVAL_MS)));
    const timeout = setTimeout(
      () =>
        setTyped({
          key,
          length: Math.min(text.length, length + charactersPerTick),
        }),
      TICK_INTERVAL_MS,
    );
    return () => clearTimeout(timeout);
  }, [text, key, length]);

  return text.slice(0, length);
};
