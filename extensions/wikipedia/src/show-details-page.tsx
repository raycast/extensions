import { Action, ActionPanel, Detail } from "@raycast/api";
import { encodeTitle } from "./wikipedia";

function ShowDetailsPage(props: { title: string; extract: string | undefined; description: string | undefined }) {
  const markdown = `
  
  # ${props.title}
  
  ###### ${props.description ? props.description : ""}

  ---

  ${props.extract} [read more](https://wikipedia.org/wiki/${encodeTitle(props.title)})

  `;

  return (
    <Detail
      navigationTitle={props.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://wikipedia.org/wiki/${encodeTitle(props.title)}`} />
          <Action.CopyToClipboard
            shortcut={{ modifiers: ["cmd"], key: "." }}
            title="Copy URL"
            content={`https://wikipedia.org/wiki/${encodeTitle(props.title)}`}
          />
        </ActionPanel>
      }
    />
  );
}

export default ShowDetailsPage;
