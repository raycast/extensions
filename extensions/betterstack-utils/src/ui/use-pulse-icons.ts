import { useEffect, useState } from "react";
import { Color, Icon, Image, environment } from "@raycast/api";
import { getPulseFrames, supportsAnimatedPulse } from "@/ui/pulse-icon";

const FRAME_INTERVAL_MS = 500;

function fallbackIcon(color: Color.Dynamic): Image.ImageLike {
  return { source: Icon.CircleFilled, tintColor: color };
}

export function usePulseIcons<State extends string>(
  states: State[],
  colors: Record<State, Color.Dynamic>,
): Record<State, Image.ImageLike> {
  const [frames, setFrames] = useState<Partial<Record<State, string[]>>>({});
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    states.forEach((state) => {
      void getPulseFrames(colors[state], environment.appearance)
        .then((images) => setFrames((current) => ({ ...current, [state]: images })))
        .catch(() => {});
    });
  }, [states, colors]);

  useEffect(() => {
    if (supportsAnimatedPulse()) return;

    const interval = setInterval(() => setFrameIndex((index) => index + 1), FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return states.reduce(
    (icons, state) => {
      const stateFrames = frames[state];
      icons[state] = stateFrames ? stateFrames[frameIndex % stateFrames.length] : fallbackIcon(colors[state]);
      return icons;
    },
    {} as Record<State, Image.ImageLike>,
  );
}
