import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { SessionError, forgetPuzzle, getInput, getPuzzle, hasSession, puzzleUrl } from "../lib/aoc";
import { SubmitForm } from "./submit-form";

type Props = { year: number; day: number; isRoot?: boolean };

export function PuzzleDetail({ year, day, isRoot = false }: Props) {
  const { data, isLoading, error, revalidate } = useCachedPromise(getPuzzle, [year, day], {
    failureToastOptions: { title: "Couldn't load the puzzle" },
  });
  const url = puzzleUrl(year, day);
  const nextPart: 1 | 2 | undefined = data && data.stars < 2 ? ((data.stars + 1) as 1 | 2) : undefined;

  async function copyInput() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading your input…" });
    try {
      await Clipboard.copy(await getInput(year, day));
      toast.style = Toast.Style.Success;
      toast.title = "Copied puzzle input";
    } catch (inputError) {
      await toast.hide();
      await showFailureToast(inputError, { title: "Couldn't load your input" });
    }
  }

  function refresh() {
    forgetPuzzle(year, day);
    revalidate();
  }

  const markdown = error ? `# Couldn't load day ${day}\n\n${error.message}` : (data?.markdown ?? "");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={isRoot ? undefined : `Day ${day} · ${year}`}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Event" text={`Advent of Code ${year}`} />
            <Detail.Metadata.Label title="Stars" text={data.stars === 0 ? "None yet" : "⭐".repeat(data.stars)} />
            {data.answers.map((answer, index) => (
              <Detail.Metadata.Label key={index} title={`Part ${index + 1} Answer`} text={answer} />
            ))}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Puzzle" target={url} text="Open on adventofcode.com" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {hasSession() ? (
            <>
              <Action title="Copy Puzzle Input" icon={Icon.Clipboard} onAction={copyInput} />
              {nextPart && (
                <Action.Push
                  title={`Submit Part ${nextPart} Answer`}
                  icon={Icon.Star}
                  shortcut={Keyboard.Shortcut.Common.Save}
                  target={<SubmitForm year={year} day={day} part={nextPart} onCorrect={revalidate} />}
                />
              )}
            </>
          ) : (
            <Action title="Add Session Cookie" icon={Icon.Key} onAction={openExtensionPreferences} />
          )}
          <Action.OpenInBrowser url={url} />
          <Action.OpenInBrowser
            title="Open Puzzle Input"
            url={`${url}/input`}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
          />
          <Action.CopyToClipboard title="Copy Puzzle URL" content={url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          {error instanceof SessionError && (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
        </ActionPanel>
      }
    />
  );
}
