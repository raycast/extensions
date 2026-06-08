import { Action, ActionPanel, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import {
  buildSpinFrameOrder,
  formatSpinWheelMarkdown,
  pickSpinWinnerIndex,
  removeSpinWheelItemAtIndex,
  sanitizeSpinWheelItem,
} from "./spin-wheel";

const SPIN_FRAME_DURATION_MS = 90;

function formatWinRate(itemCount: number): string {
  if (itemCount <= 0) {
    return "n/a";
  }

  return `${(100 / itemCount).toFixed(itemCount > 6 ? 1 : 0)}% each`;
}

function SpinDecisionWheelResult({
  items,
  onEdit,
  onSpinAgain,
  winnerIndex,
}: {
  items: string[];
  onEdit: () => void;
  onSpinAgain: () => void;
  winnerIndex: number;
}) {
  const winner = items[winnerIndex] ?? "Unknown option";

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={winner} title="Copy Winner" />
          <Action title="Spin Again" onAction={onSpinAgain} />
          <Action title="Edit Options" onAction={onEdit} />
        </ActionPanel>
      }
      markdown={formatSpinWheelMarkdown({ activeIndex: winnerIndex, items, phase: "result", progress: 1 })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Winner" text={winner} />
          <Detail.Metadata.Label title="Options" text={String(items.length)} />
          <Detail.Metadata.Label title="Win Rate" text={formatWinRate(items.length)} />
          <Detail.Metadata.Label title="Winning Slot" text={`#${winnerIndex + 1}`} />
        </Detail.Metadata>
      }
    />
  );
}

function SpinDecisionWheelSpinning({
  activeIndex,
  items,
  onEdit,
  progress,
}: {
  activeIndex: number;
  items: string[];
  onEdit: () => void;
  progress: number;
}) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Edit Options" onAction={onEdit} />
        </ActionPanel>
      }
      markdown={formatSpinWheelMarkdown({ activeIndex, items, phase: "spinning", progress })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Options in Play" text={String(items.length)} />
          <Detail.Metadata.Label title="Live Odds" text={formatWinRate(items.length)} />
        </Detail.Metadata>
      }
    />
  );
}

export default function SpinDecisionWheelCommand() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [frameOrder, setFrameOrder] = useState<number[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isSpinning || frameOrder.length === 0) {
      return;
    }

    setFrameIndex(0);

    const frameInterval = setInterval(() => {
      setFrameIndex((currentFrameIndex) => {
        if (currentFrameIndex >= frameOrder.length - 1) {
          clearInterval(frameInterval);
          setIsSpinning(false);
          return currentFrameIndex;
        }

        return currentFrameIndex + 1;
      });
    }, SPIN_FRAME_DURATION_MS);

    return () => {
      clearInterval(frameInterval);
    };
  }, [frameOrder, isSpinning]);

  async function handleAddItem() {
    const nextItem = sanitizeSpinWheelItem(searchText);

    if (nextItem.length === 0) {
      await showToast({
        message: "Type an option before pressing Enter.",
        style: Toast.Style.Failure,
        title: "No option to add",
      });
      return;
    }

    if (items.includes(nextItem)) {
      await showToast({
        message: "Option already exists.",
        style: Toast.Style.Failure,
        title: "Duplicate option",
      });
      return;
    }

    setItems((currentItems) => [...currentItems, nextItem]);
    setSearchText("");
  }

  async function handleSpin() {
    if (items.length === 0) {
      await showToast({
        message: "Add at least one option before spinning.",
        style: Toast.Style.Failure,
        title: "No options found",
      });
      return;
    }

    const nextWinnerIndex = pickSpinWinnerIndex(items);

    setWinnerIndex(nextWinnerIndex);
    setFrameOrder(buildSpinFrameOrder(items.length, nextWinnerIndex));
    setIsSpinning(true);
  }

  function handleRemoveItem(index: number) {
    setItems((currentItems) => removeSpinWheelItemAtIndex(currentItems, index));
  }

  function handleEditOptions() {
    setIsSpinning(false);
    setWinnerIndex(null);
    setFrameOrder([]);
    setFrameIndex(0);
  }

  if (isSpinning && items.length > 0 && frameOrder.length > 0) {
    const activeIndex = frameOrder[frameIndex] ?? frameOrder[0] ?? 0;
    const progress = frameOrder.length === 1 ? 1 : frameIndex / (frameOrder.length - 1);

    return (
      <SpinDecisionWheelSpinning
        activeIndex={activeIndex}
        items={items}
        onEdit={handleEditOptions}
        progress={progress}
      />
    );
  }

  if (winnerIndex !== null && items.length > 0) {
    return (
      <SpinDecisionWheelResult
        items={items}
        onEdit={handleEditOptions}
        onSpinAgain={handleSpin}
        winnerIndex={winnerIndex}
      />
    );
  }

  const addItemTitle = searchText.length > 0 ? `Add "${searchText}"` : "Type an option to add";
  const previewMessage =
    items.length === 0
      ? "Add options with Enter. Use Cmd+Enter to spin once the list is ready."
      : `${items.length} option${items.length === 1 ? "" : "s"} ready. Each one currently has ${formatWinRate(items.length)}.`;

  return (
    <List
      filtering={false}
      navigationTitle="Spin Decision Wheel"
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type an option and press Enter"
      searchText={searchText}
      selectedItemId={searchText.length > 0 ? "composer" : undefined}
    >
      <List.Section title="Composer">
        <List.Item
          id="composer"
          accessories={[{ tag: `${items.length} option${items.length === 1 ? "" : "s"}` }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Option" />
              <Action
                icon={Icon.ArrowClockwise}
                onAction={handleSpin}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                title="Spin Decision Wheel"
              />
            </ActionPanel>
          }
          icon={Icon.PlusCircle}
          subtitle={previewMessage}
          title={addItemTitle}
        />
      </List.Section>
      <List.Section subtitle={`${items.length}`} title="Options in Play">
        {items.length === 0 ? (
          <List.Item
            id="empty-state"
            actions={
              <ActionPanel>
                <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Option" />
              </ActionPanel>
            }
            icon={Icon.MinusCircle}
            title="No options yet"
          />
        ) : (
          items.map((item, index) => (
            <List.Item
              id={`option-${index}`}
              key={`option-${index}-${item}`}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Plus} onAction={handleAddItem} title="Add Option" />
                  <Action
                    icon={Icon.ArrowClockwise}
                    onAction={handleSpin}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    title="Spin Decision Wheel"
                  />
                  <Action
                    icon={Icon.Trash}
                    onAction={() => handleRemoveItem(index)}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    title="Remove Option"
                  />
                </ActionPanel>
              }
              accessories={[{ tag: formatWinRate(items.length) }]}
              title={item}
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
