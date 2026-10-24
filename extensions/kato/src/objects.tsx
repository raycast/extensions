import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { katoApi } from "./api";
import { ErrorActions } from "./error-actions";
import { recordIcon } from "./icons";
import { accessTokenOptions } from "./oauth";
import { RecordListView } from "./record-browser";
import type { ObjectTypeOption } from "./types";

function ObjectsCommand() {
  const [objects, setObjects] = useState<ObjectTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      setObjects(await katoApi.objects());
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search objects…">
      {error ? (
        <List.EmptyView
          title="Could not load objects"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions command="objects" onRetry={() => void load()} />
          }
        />
      ) : null}
      {!error && !isLoading && objects.length === 0 ? (
        <List.EmptyView title="No objects yet" icon={Icon.Folder} />
      ) : null}
      {objects.map((object) => (
        <List.Item
          key={object.id}
          icon={recordIcon(object.icon, object.color)}
          title={object.pluralName}
          subtitle={object.description ?? undefined}
          accessories={[{ text: object.singularName }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={`View ${object.pluralName}`}
                icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
                target={<RecordListView object={object} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(ObjectsCommand);
