import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useNotebooks } from "./useNotebooks";
import { linkDomain, notEmpty } from "./util";

// noinspection JSUnusedGlobalSymbols
export default function CommandListNotebooks() {
  const { notebooks, notebooksAreLoading } = useNotebooks();

  return (
    <List isLoading={notebooksAreLoading}>
      {notebooks.map(notebook => (
        <List.Item
          key={notebook.id}
          icon={{
            source: Icon.Star,
            tintColor: notebook.attributes?.metadata?.additionalProperties?.is_favorite
              ? Color.Yellow
              : Color.SecondaryText,
          }}
          title={notebook.attributes.name}
          subtitle={notebook.attributes.metadata?.type as string}
          accessories={[
            { text: notebook.attributes.author?.name },
            {
              icon: {
                source: notebook.attributes.author?.icon as string,
                mask: Image.Mask.Circle,
                fallback: Icon.PersonCircle,
              },
              tooltip: notebook.attributes.author?.email as string,
            },
          ]}
          keywords={[notebook.attributes.metadata?.type as string, notebook.attributes.author?.email as string]
            .concat((notebook.attributes.author?.name as string).split(" "))
            .filter(notEmpty)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://${linkDomain()}/notebook/${notebook.id}`} />
              <Action.CopyToClipboard content={`https://${linkDomain()}/notebook/${notebook.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
