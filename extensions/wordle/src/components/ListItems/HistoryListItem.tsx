import { Action, ActionPanel, Color, environment, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { EXTENSION_AUTHOR_NAME, GUESS_LIMIT, HINT_TYPE_UNICODE_MAP, LANGUAGE_UNICODE_MAP } from "@src/constants";
import { EntryState, EntryStateColorMap, Language, LocalStorageEntry } from "@src/types";
import { formatTime, showErrorToast, isToday, determineHints } from "@src/util";
import { HistoryListItemDetail } from "@src/components";

type HistoryListItemProps = {
  entry: LocalStorageEntry;
  deleteAllEntries: () => Promise<void>;
  deleteEntry: (entryId: { date: Date; language: Language }) => Promise<void>;
};

export const HistoryListItem = ({ entry, deleteAllEntries, deleteEntry }: HistoryListItemProps) => {
  const { date, language, wordsOfGuesses, solution } = entry;

  const formattedDate = `${formatTime(date.getMonth() + 1)}/${formatTime(date.getDate())}/${date.getFullYear()}`;
  const attemptCount = wordsOfGuesses.length.toString();
  const hintsOfAllGuesses = wordsOfGuesses.map((word) => determineHints(word, solution));
  const unicodeHints = hintsOfAllGuesses.map((hints) => hints.map((hint) => HINT_TYPE_UNICODE_MAP[hint.type]));
  const unicodeStrings = unicodeHints.map((hints) => hints.join(""));
  const extensionLink = `https://www.raycast.com/${EXTENSION_AUTHOR_NAME}/${environment.extensionName}`;

  const isSuccessfulEntry = wordsOfGuesses.includes(solution);
  const isFailedEntry = !isSuccessfulEntry && (!isToday(date) || wordsOfGuesses.length === GUESS_LIMIT);
  const isEntryInProgress = isToday(date) && !isSuccessfulEntry && !isFailedEntry;

  const summaryToCopy = `Wordle Raycast Edition • ${formattedDate} • ${LANGUAGE_UNICODE_MAP[language]}\n${
    isSuccessfulEntry ? "✅" : "❌"
  } • ${attemptCount}/${GUESS_LIMIT} Attempts\n\n${unicodeStrings.join("\n")}\n\nJoin playing on: ${extensionLink}`;

  const entryStateColorMap: EntryStateColorMap = {
    [EntryState.SUCCESS]: { color: Color.Green, condition: isSuccessfulEntry },
    [EntryState.FAILURE]: { color: Color.Red, condition: isFailedEntry },
    [EntryState.IN_PROGRESS]: { color: Color.Orange, condition: isEntryInProgress },
  };
  const entryStates = Object.entries(entryStateColorMap).map(([state, { color, condition }]) => ({
    state,
    color,
    condition,
  }));
  const activeEntryStates = entryStates.filter((state) => state.condition);

  const continuePlaying = async () => {
    try {
      await launchCommand({ name: `play_${language}`, type: LaunchType.UserInitiated });
    } catch {
      await showErrorToast({ title: "Failed to continue playing" });
    }
  };

  return (
    <List.Item
      title={formattedDate}
      subtitle={language}
      accessories={[
        ...activeEntryStates.map((state) => ({
          tag: {
            value: state.state,
            color: state.color,
          },
        })),
      ]}
      keywords={[...wordsOfGuesses, solution, ...activeEntryStates.map((state) => state.state)]}
      actions={
        <ActionPanel>
          {isEntryInProgress && <Action icon={Icon.Play} title="Continue Playing" onAction={continuePlaying} />}
          {!isEntryInProgress && (
            <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Summary" content={summaryToCopy} />
          )}
          <Action
            icon={Icon.Trash}
            title="Delete Summary"
            onAction={() => {
              deleteEntry({ language, date });
            }}
            style={Action.Style.Destructive}
          />
          <Action
            icon={Icon.Trash}
            title="Delete All Summaries"
            onAction={deleteAllEntries}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
      detail={<HistoryListItemDetail entry={entry} entryStateColorMap={entryStateColorMap} />}
    />
  );
};
