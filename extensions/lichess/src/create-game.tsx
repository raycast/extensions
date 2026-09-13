import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

import { createRealtimeBoardSeek } from "./api/lichess";
import { createGameUrl, gameUrl } from "./lib/lichessUrls";
import type { ClockValues } from "./lib/timeControl";
import { isSupportedRealtimeSeekClock, MAX_CLOCK_VALUE, MIN_CLOCK_VALUE, parseClockValue } from "./lib/timeControl";

interface CreateGameValues {
  time: string;
  increment: string;
  rated: boolean;
  color: "random" | "white" | "black";
}

const DEFAULT_TIME = "10";
const DEFAULT_INCREMENT = "0";
const LICHESS_TOKEN_URL = "https://lichess.org/account/oauth/token";

export default function Command() {
  const token = getPreferenceValues<Preferences.CreateGame>().lichessApiToken?.trim();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: CreateGameValues) {
    const clock = await parseClockValues(values);

    if (!token) {
      await showMissingTokenToast();
      return;
    }

    if (!clock) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createGame(token, clock, values);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return <TokenSetupView />;
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Create Game"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Game" icon={Icon.Play} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open Lichess Token Page" url={LICHESS_TOKEN_URL} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="time"
        title="Game Time"
        defaultValue={DEFAULT_TIME}
        placeholder="10"
        info="Minutes per side. Lichess Board API public seeks must be rapid or classical."
      />
      <Form.TextField
        id="increment"
        title="Increment"
        defaultValue={DEFAULT_INCREMENT}
        placeholder="0"
        info="Seconds per move. Examples that work: 10+0, 8+0, 5+5."
      />
      <Form.Dropdown id="color" title="Color" defaultValue="random">
        <Form.Dropdown.Item value="random" title="Random" />
        <Form.Dropdown.Item value="white" title="White" />
        <Form.Dropdown.Item value="black" title="Black" />
      </Form.Dropdown>
      <Form.Checkbox title="Rated" id="rated" label="Create a rated game" defaultValue />
    </Form>
  );
}

function TokenSetupView() {
  return (
    <Detail
      markdown={`# Lichess API Token Required

Create Game needs a Lichess token to create a seek from Raycast.

1. Open ${LICHESS_TOKEN_URL}
2. Create a personal access token
3. Enable the \`board:play\` scope
4. Paste the token in Create Game preferences`}
      actions={
        <ActionPanel>
          <Action title="Open Create Game Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          <Action.OpenInBrowser title="Open Lichess Token Page" url={LICHESS_TOKEN_URL} />
        </ActionPanel>
      }
    />
  );
}

async function createGame(token: string, clock: ClockValues, values: CreateGameValues) {
  await showToast({
    style: Toast.Style.Animated,
    title: "Creating Lichess seek",
    message: `${clock.time}+${clock.increment} ${values.rated ? "rated" : "casual"}`,
  });

  try {
    const gameId = await createRealtimeBoardSeek({
      token,
      time: clock.time,
      increment: clock.increment,
      rated: values.rated,
      color: values.color,
      variant: "standard",
    });

    await showToast({
      style: Toast.Style.Success,
      title: gameId ? "Game started" : "Seek created",
      message: gameId ? "Opening game on Lichess." : "Opening Lichess lobby.",
    });

    await open(gameId ? gameUrl(gameId) : createGameUrl());
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not create Lichess seek",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function parseClockValues(values: CreateGameValues): Promise<ClockValues | undefined> {
  const time = parseClockValue(values.time);
  const increment = parseClockValue(values.increment);

  if (time === undefined) {
    await showInvalidClockToast("time");
    return undefined;
  }

  if (increment === undefined) {
    await showInvalidClockToast("increment");
    return undefined;
  }

  if (!isSupportedRealtimeSeekClock({ time, increment })) {
    await showUnsupportedClockToast();
    return undefined;
  }

  return { time, increment };
}

async function showInvalidClockToast(field: string) {
  await showToast({
    style: Toast.Style.Failure,
    title: `Invalid game ${field}`,
    message: `Use an integer between ${MIN_CLOCK_VALUE} and ${MAX_CLOCK_VALUE}.`,
  });
}

async function showUnsupportedClockToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Invalid time control",
    message: "Lichess Board API only supports rapid/classical seeks. Try 10+0, 8+0, or 5+5.",
  });
}

async function showMissingTokenToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Lichess API token missing",
    message: "Create a token with the board:play scope in command preferences.",
  });
  await openCommandPreferences();
}
