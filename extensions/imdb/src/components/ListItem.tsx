import { ActionPanel, CopyToClipboardAction, List, OpenInBrowserAction } from "@raycast/api";
import type { Title } from "../types";

export const ListItem = (props: { title: Title }) => {
  const title = props.title;

  // nicely space each row's plot content
  const takenSpace = title.Title.length + title.Year.length + 4;

  return (
    <List.Item
      title={title.Title}
      subtitle={`(${title.Year})  ${title.Plot.slice(0, 92 - takenSpace)}...`}
      icon={title.Poster}
      accessoryTitle={title.imdbRating}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={`https://www.imdb.com/title/${title.imdbID}/`} />
          <CopyToClipboardAction title="Copy URL" content={`https://www.imdb.com/title/${title.imdbID}/`} />
        </ActionPanel>
      }
    />
  );
};
