import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { DICE_SPIN_FRAMES, FRAME_DURATION_MS, ROLL_DURATION_MS } from "./constants";
import { buildRollLabels, formatRollingMarkdown, formatRollDiceMarkdown, rollSingleDie } from "./roll-dice";

import type { DiceResult } from "./types";

function RollDiceStartView({ onRoll }: { onRoll: () => void }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Roll Die" onAction={onRoll} />
        </ActionPanel>
      }
      markdown={`# Roll a Die\n\nPress **Roll Die** to throw a six-sided die and reveal the result.`}
    />
  );
}

export default function RollDiceCommand() {
  const [result, setResult] = useState<DiceResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [rollLabels, setRollLabels] = useState<string[]>(() => buildRollLabels(DICE_SPIN_FRAMES.length));

  useEffect(() => {
    if (!isRolling) {
      return;
    }

    setResult(null);
    setFrameIndex(0);

    const frameInterval = setInterval(() => {
      setFrameIndex((current) => (current < DICE_SPIN_FRAMES.length - 1 ? current + 1 : current));
    }, FRAME_DURATION_MS);

    const finishTimeout = setTimeout(() => {
      clearInterval(frameInterval);
      setResult(rollSingleDie());
      setIsRolling(false);
    }, ROLL_DURATION_MS);

    return () => {
      clearInterval(frameInterval);
      clearTimeout(finishTimeout);
    };
  }, [isRolling]);

  function handleRoll() {
    if (isRolling) {
      return;
    }

    setRollLabels(buildRollLabels(DICE_SPIN_FRAMES.length));
    setIsRolling(true);
  }

  if (isRolling) {
    return (
      <Detail
        markdown={formatRollingMarkdown(
          frameIndex,
          rollLabels[frameIndex] ?? rollLabels[0] ?? "Rolling the impossible",
        )}
      />
    );
  }

  if (result === null) {
    return <RollDiceStartView onRoll={handleRoll} />;
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Roll Again" onAction={handleRoll} />
          <Action.CopyToClipboard content={String(result)} title="Copy Result" />
        </ActionPanel>
      }
      markdown={formatRollDiceMarkdown(result)}
    />
  );
}
