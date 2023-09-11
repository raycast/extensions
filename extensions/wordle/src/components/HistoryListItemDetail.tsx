import { Fragment } from "react";
import { List } from "@raycast/api";
import { HINT_TYPE_COLOR_MAP } from "@src/constants";
import { EntryState, EntryStateColorMap, LocalStorageEntry } from "@src/types";
import { determineHints, formatTime, getUppercaseValue } from "@src/util";

const ListItemDetailMetadataEmpty = () => <List.Item.Detail.Metadata.Label title="" />;

type HistoryListItemDetailProps = {
  entry: LocalStorageEntry;
  entryStateColorMap: EntryStateColorMap;
};

export const HistoryListItemDetail = ({ entry, entryStateColorMap }: HistoryListItemDetailProps) => {
  const { date, language, wordsOfGuesses, solution } = entry;

  const formattedDate = `${formatTime(date.getMonth() + 1)}/${formatTime(date.getDate())}/${date.getFullYear()}`;
  const attemptCount = wordsOfGuesses.length.toString();

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {wordsOfGuesses.map((word, index) => (
            <Fragment key={word}>
              <List.Item.Detail.Metadata.TagList title={`Guess ${index + 1}`}>
                {determineHints(word, solution).map(({ value, type }, index) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={`${index}-${value}`}
                    text={getUppercaseValue(value)}
                    color={HINT_TYPE_COLOR_MAP[type]}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          ))}
          <ListItemDetailMetadataEmpty />
          {entryStateColorMap[EntryState.IN_PROGRESS].condition ? (
            <List.Item.Detail.Metadata.TagList title="Solution">
              <List.Item.Detail.Metadata.TagList.Item
                text={EntryState.IN_PROGRESS}
                color={entryStateColorMap[EntryState.IN_PROGRESS].color}
              />
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Solution" text={getUppercaseValue(solution)} />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Attempts" text={attemptCount} />
          <List.Item.Detail.Metadata.Separator />
          <ListItemDetailMetadataEmpty />
          <List.Item.Detail.Metadata.Label title="Date" text={formattedDate} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Language" text={language} />
          <List.Item.Detail.Metadata.Separator />
          <ListItemDetailMetadataEmpty />
        </List.Item.Detail.Metadata>
      }
    />
  );
};
