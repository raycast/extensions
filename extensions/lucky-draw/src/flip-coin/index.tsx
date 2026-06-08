import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect, useState } from "react";

import { flipCoin, buildFlipLabels, formatFlippingMarkdown, formatFlipCoinMarkdown } from "./flip-coin";
import { FRAME_DURATION_MS, FLIP_FRAMES, FLIP_DURATION_MS } from "./constants";

import type { FlipFrame } from "./types";

// View for the start of the coin flip
function FlipCoinStartView({ onFlip }: { onFlip: () => void }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Flip Coin" onAction={onFlip} />
        </ActionPanel>
      }
      markdown={`# Toss a Coin\n\nPress **Flip Coin** to launch the coin and reveal the result.`}
    />
  );
}

// Main command for the coin flip
export default function FlipCoinCommand() {
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const [flipLabels, setFlipLabels] = useState<string[]>(() => buildFlipLabels(FLIP_FRAMES.length));

  /**
   * Handle the flipping animation when the coin is flipping.
   */
  useEffect(() => {
    if (!isFlipping) {
      return;
    }

    setResult(null);
    setFrameIndex(0);

    const frameInterval = setInterval(() => {
      setFrameIndex((current) => (current < FLIP_FRAMES.length - 1 ? current + 1 : current));
    }, FRAME_DURATION_MS);

    const finishTimeout = setTimeout(() => {
      clearInterval(frameInterval);
      setResult(flipCoin());
      setIsFlipping(false);
    }, FLIP_DURATION_MS);

    return () => {
      clearInterval(frameInterval);
      clearTimeout(finishTimeout);
    };
  }, [isFlipping]);

  /**
   * Handle the flip of the coin.
   */
  function handleFlip() {
    if (isFlipping) {
      return;
    }

    setFlipLabels(buildFlipLabels(FLIP_FRAMES.length));
    setIsFlipping(true);
  }

  /**
   * Render the flipping animation.
   */
  if (isFlipping) {
    return (
      <Detail
        markdown={formatFlippingMarkdown(
          (FLIP_FRAMES[frameIndex] as FlipFrame) ?? FLIP_FRAMES[0],
          flipLabels[frameIndex] ?? flipLabels[0] ?? "Consulting destiny",
        )}
      />
    );
  }

  /**
   * Render the result of the coin flip.
   */
  if (result === null) {
    return <FlipCoinStartView onFlip={handleFlip} />;
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Flip Again" onAction={handleFlip} />
          <Action.CopyToClipboard content={result} title="Copy Result" />
        </ActionPanel>
      }
      markdown={formatFlipCoinMarkdown(result)}
    />
  );
}
