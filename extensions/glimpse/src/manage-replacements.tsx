import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useState } from "react";
import { ErrorEmptyView } from "./error-view";
import { glimpse } from "./glimpse";

interface Replacement {
  from: string;
  to: string;
}

export default function Command() {
  const [search, setSearch] = useState("");
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async () => {
      const res = await glimpse<{ replacements: Replacement[] }>(["replacements", "list"]);
      return res.replacements;
    },
    [],
    { onError: () => undefined },
  );

  const replacements = error ? [] : (data ?? []);
  const query = search.trim().toLowerCase();
  const filtered = query
    ? replacements.filter((r) => r.from.toLowerCase().includes(query) || r.to.toLowerCase().includes(query))
    : replacements;

  async function remove(replacement: Replacement) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Removing "${replacement.from}"…` });
    try {
      await glimpse(["replacements", "remove", "--from", replacement.from]);
      toast.style = Toast.Style.Success;
      toast.title = `Removed "${replacement.from}"`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  const addAction = (
    <Action.Push
      title="Add Replacement"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<ReplacementForm draft={search.trim()} existing={replacements} onSaved={revalidate} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search replacements"
    >
      {filtered.map((replacement) => (
        <List.Item
          key={replacement.from}
          title={replacement.from}
          subtitle={`→ ${replacement.to}`}
          icon={Icon.Switch}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Replacement" content={replacement.to} />
              <Action.Push
                title="Edit Replacement"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<ReplacementForm original={replacement} existing={replacements} onSaved={revalidate} />}
              />
              {addAction}
              <Action
                title="Delete Replacement"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (
                    await confirmAlert({ title: `Delete “${replacement.from}”?`, primaryAction: { title: "Delete" } })
                  ) {
                    await remove(replacement);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {error ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          title="No replacements"
          description="Replacements swap words in your dictations."
          actions={<ActionPanel>{addAction}</ActionPanel>}
        />
      )}
    </List>
  );
}

function ReplacementForm({
  original,
  draft,
  existing,
  onSaved,
}: {
  original?: Replacement;
  draft?: string;
  existing: Replacement[];
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Replacement>({
    async onSubmit(values) {
      const from = values.from.trim();
      const toast = await showToast({ style: Toast.Style.Animated, title: `Saving "${from}"…` });
      try {
        // replacements add launches Glimpse if needed, requires an active license, and
        // updates an existing replacement with the same text.
        await glimpse(["replacements", "add", "--from", from, "--to", values.to.trim()]);
        if (original && from.toLowerCase() !== original.from.toLowerCase()) {
          await glimpse(["replacements", "remove", "--from", original.from]);
        }
        toast.style = Toast.Style.Success;
        toast.title = `Saved "${from}"`;
        onSaved();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Glimpse";
        toast.message = (error as Error).message;
      }
    },
    validation: {
      from: (value) => {
        const from = value?.trim().toLowerCase();
        if (!from) return "Enter the text to replace.";
        // replacements add would overwrite another replacement with the same text.
        if (from !== original?.from.toLowerCase() && existing.some((r) => r.from.toLowerCase() === from)) {
          return "A replacement for this text already exists.";
        }
      },
    },
    initialValues: original ?? { from: draft ?? "", to: "" },
  });

  return (
    <Form
      navigationTitle={original ? "Edit Replacement" : "Add Replacement"}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Replace" placeholder="gonna" {...itemProps.from} />
      <Form.TextField title="With" placeholder="going to" {...itemProps.to} />
    </Form>
  );
}
