import {
  Action,
  ActionPanel,
  Form,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { findMatches } from "../lib/search";
import { VaultRecordMetadata } from "../lib/model";
import { deleteRecordById, listRecords } from "../lib/storage";

function DeleteReview(props: {
  record: VaultRecordMetadata;
  onDeleted: () => void;
}) {
  const { pop } = useNavigation();

  async function onDelete() {
    const ok = await confirmAlert({
      title: `Delete '${props.record.keyName}'?`,
      message: "This will permanently delete the entry.",
      primaryAction: { title: "Delete" },
    });

    if (!ok) return;

    await deleteRecordById(props.record.id);
    await showToast({
      style: Toast.Style.Success,
      title: "Deleted",
      message: props.record.keyName,
    });
    props.onDeleted();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Delete"
            style={Action.Style.Destructive}
            onAction={onDelete}
          />
          <Action title="Cancel" onAction={() => pop()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Key Name" text={props.record.keyName} />
      <Form.Description
        title="Application"
        text={props.record.application || "-"}
      />
      <Form.Description title="Service" text={props.record.service || "-"} />
      <Form.Description
        title="Tags"
        text={props.record.tags.length ? props.record.tags.join(", ") : "-"}
      />
    </Form>
  );
}

export default function DeleteCommand() {
  const [query, setQuery] = useState("");
  const {
    data: records,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => await listRecords(), [], {
    keepPreviousData: true,
  });

  const matches = useMemo(
    () => findMatches(records ?? [], query),
    [records, query],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to find a key to delete (matches name, app, service, tags)"
      onSearchTextChange={setQuery}
      throttle
    >
      {matches.map((m) => (
        <List.Item
          key={m.record.id}
          title={m.record.keyName}
          subtitle={[m.record.application, m.record.service]
            .filter(Boolean)
            .join(" · ")}
          accessories={
            m.record.tags.length
              ? [{ tag: { value: m.record.tags.join(", ") } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Delete…"
                target={
                  <DeleteReview record={m.record} onDeleted={revalidate} />
                }
              />
              <Action title="Refresh" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
