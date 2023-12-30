import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  PopToRootType,
  clearSearchBar,
  closeMainWindow,
} from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [{ queue }, setBeatQueue] = useState(() => ({ queue: new BeatQueue() }));
  queue.onReset = (queue) => setBeatQueue({ queue });

  const handleSearch = () => {
    setBeatQueue(({ queue }) => {
      queue.beat();
      return { queue };
    });
    clearSearchBar();
  };

  const handleCopyResult = () => {
    Clipboard.copy(queue.bpm.toFixed(0));
    closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  };

  let message: string;
  let subtitle: string | undefined;
  let color: Color;
  let loading: boolean;
  let action: string | undefined;

  switch (queue.state) {
    case "initial":
      message = "Waiting for pattern…";
      color = Color.SecondaryText;
      loading = false;
      break;
    case "calculating":
      message = `${queue.bpm.toFixed()} BPM`;
      color = Color.SecondaryText;
      loading = false;
      break;
    case "stable":
      message = `${queue.bpm.toFixed()} BPM`;
      color = Color.Red;
      loading = false;
      break;
    case "unstable":
      message = `${queue.bpm.toFixed()} BPM`;
      color = Color.SecondaryText;
      subtitle = "Steady…";
      loading = false;
      break;
    case "result":
      message = `${queue.bpm.toFixed()} BPM`;
      color = Color.Red;
      loading = false;
      action = "Copy to Clipboard";
      break;
  }

  return (
    <List
      onSearchTextChange={(query) => {
        if (query.length > 0) {
          handleSearch();
        }
      }}
      isLoading={loading}
      searchBarPlaceholder="Tap any key…"
    >
      <List.Item
        title={message}
        icon={{ source: Icon.Music, tintColor: color }}
        subtitle={subtitle}
        accessories={action ? [{ text: action }] : undefined}
        actions={
          <ActionPanel>
            <Action
              title={action ?? "Tap"}
              onAction={() => {
                if (queue.state === "result") {
                  handleCopyResult();
                } else {
                  handleSearch();
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

class BeatQueue {
  public onReset?: (queue: BeatQueue) => void;

  private queue = new Array<Beat | undefined>(QUEUE_SIZE);
  private next = 0;
  private last = QUEUE_SIZE - 1;
  private count = 0;
  private timer?: NodeJS.Timeout;
  private lastStableBPM = 0;
  private latestBPM = 0;
  private steady = false;

  constructor() {
    this.reset();
  }

  public beat() {
    const lastTS = this.queue[this.last]?.ts;
    const nowTS = performance.now();
    const delta = lastTS !== undefined ? ONE_MINUTE / (nowTS - lastTS) : undefined;
    this.queue[this.next] = { ts: nowTS, delta };
    this.last = this.next;
    this.next = (this.next + 1) % QUEUE_SIZE;
    this.count++;

    const [min, max] = this.queue.reduce<[number, number]>(
      (range, beat) => {
        if (beat?.delta != null) {
          range[0] = Math.min(range[0], beat.delta);
          range[1] = Math.max(range[1], beat.delta);
        }
        return range;
      },
      [Infinity, 0],
    );
    this.steady = max - min < BEAT_STEADINESS;
    if (this.steady && this.count >= QUEUE_SIZE) {
      this.lastStableBPM = this.queue[this.last]?.delta ?? this.lastStableBPM;
    } else {
      this.lastStableBPM = 0;
    }

    const sum = this.queue.reduce<number>((bpm, beat) => bpm + (beat?.delta ?? 0), 0);
    const amount = Math.min(this.count > QUEUE_SIZE ? this.count : this.count - 1, QUEUE_SIZE);
    this.latestBPM = sum / amount;

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.reset();
    }, QUEUE_TIMEOUT);
    return this;
  }

  public get bpm() {
    return this.latestBPM || this.lastStableBPM;
  }

  public get state(): BeatQueueState {
    if (this.latestBPM > 0) {
      if (this.count < QUEUE_SIZE) {
        return "calculating";
      } else if (this.steady) {
        return "stable";
      } else {
        return "unstable";
      }
    } else {
      if (this.lastStableBPM > 0) {
        return "result";
      } else {
        return "initial";
      }
    }
  }

  public reset() {
    this.queue = new Array(QUEUE_SIZE);
    this.next = 0;
    this.last = QUEUE_SIZE - 1;
    this.count = 0;
    this.latestBPM = 0;
    this.onReset?.(this);
  }
}

const QUEUE_SIZE = 6;
const QUEUE_TIMEOUT = 1200;
const BEAT_STEADINESS = 20;
const ONE_MINUTE = 1000 * 60;

type Beat = {
  ts: number;
  delta?: number;
};

type BeatQueueState =
  // Initial state when the command is run
  | "initial"
  // During the first few beats where there's not enough data to be accurate but we still show an estimate
  | "calculating"
  // The beta has been fairly stable
  | "stable"
  // The beat is changing from one bpm to another
  | "unstable"
  // The user stopped after obtaining a steady beat
  | "result";
