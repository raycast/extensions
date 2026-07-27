import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import { useConfig } from "../../hooks";
import { searchString, withFilter, withoutFilter, type Config, type SavedFilter } from "../../lib/config";

const ROLES = [
  { value: "", title: "— none —" },
  { value: "review-requested", title: "review-requested" },
  { value: "author", title: "author" },
  { value: "assignee", title: "assignee" },
  { value: "mentions", title: "mentions" },
  { value: "involves", title: "involves" },
];

const STATES = [
  { value: "open", title: "open" },
  { value: "closed", title: "closed" },
  { value: "merged", title: "merged" },
];

type FilterFormProps = {
  config: Config;
  /** The filter being edited; omit to create a new one. */
  existing?: SavedFilter;
  onSave: (filter: SavedFilter, replacingName?: string) => Promise<void>;
};

/**
 * Builds a saved filter either field by field or, for anything the fields
 * can't express, as a raw GitHub search string.
 */
function FilterForm({ config, existing, onSave }: FilterFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(existing?.name ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [raw, setRaw] = useState(existing?.raw ?? "");
  const [role, setRole] = useState(existing?.role ?? "");
  const [subject, setSubject] = useState(existing?.subject ?? "@me");
  const [state, setState] = useState(existing?.state ?? "open");
  const [scopes, setScopes] = useState((existing?.scopes ?? []).join(" "));
  const [extra, setExtra] = useState(existing?.extra ?? "");

  const draft: SavedFilter = {
    name: name.trim(),
    raw: raw.trim() || undefined,
    role: role || undefined,
    subject: subject.trim() || undefined,
    state,
    scopes: scopes.trim() ? scopes.trim().split(/\s+/) : undefined,
    extra: extra.trim() || undefined,
  };

  return (
    <Form
      navigationTitle={existing ? `Edit “${existing.name}”` : "New Saved Filter"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existing ? "Save Changes" : "Create Filter"}
            onSubmit={async () => {
              if (!draft.name) {
                setNameError("Give the filter a name");
                return;
              }
              await onSave(draft, existing?.name);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Backend team, needs triage…"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError) setNameError(undefined);
        }}
      />
      <Form.Separator />
      <Form.Description text="Compose the query from the fields below, or skip them and write a raw GitHub search string." />
      <Form.Dropdown id="role" title="Role" value={role} onChange={setRole}>
        {ROLES.map((r) => (
          <Form.Dropdown.Item key={r.value || "none"} value={r.value} title={r.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="subject"
        title="Subject"
        placeholder="@me, a login, or team:org/slug"
        info="Use team:org/slug with the review-requested role to match a whole team."
        value={subject}
        onChange={setSubject}
      />
      <Form.Dropdown id="state" title="State" value={state} onChange={setState}>
        {STATES.map((s) => (
          <Form.Dropdown.Item key={s.value} value={s.value} title={s.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="scopes"
        title="Scopes"
        placeholder="org:acme repo:acme/api"
        info="Space-separated org:/repo: qualifiers. Leave empty to use the default scope."
        value={scopes}
        onChange={setScopes}
      />
      <Form.TextField
        id="extra"
        title="Extra Qualifiers"
        placeholder="draft:false label:bug"
        value={extra}
        onChange={setExtra}
      />
      <Form.Separator />
      <Form.TextField
        id="raw"
        title="Raw Query"
        placeholder="is:pr is:open review-requested:@me sort:updated-desc"
        info="When set, this replaces everything above and is sent to GitHub verbatim."
        value={raw}
        onChange={setRaw}
      />
      <Form.Description title="Preview" text={searchString(draft, config) || "—"} />
    </Form>
  );
}

/** Manages the saved filters that appear alongside the built-in categories. */
export function SavedFilters() {
  const { config, update } = useConfig();

  const newAction = (
    <Action.Push
      icon={Icon.Plus}
      title="New Filter…"
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <FilterForm config={config} onSave={(filter, replacing) => update(withFilter(config, filter, replacing))} />
      }
    />
  );

  async function remove(filter: SavedFilter) {
    const confirmed = await confirmAlert({
      title: `Delete “${filter.name}”?`,
      message: "The filter disappears from the category dropdown. This can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await update(withoutFilter(config, filter.name));
  }

  return (
    <List
      navigationTitle="Saved Filters"
      searchBarPlaceholder="Filter saved filters…"
      isShowingDetail={config.filters.length > 0}
      actions={<ActionPanel>{newAction}</ActionPanel>}
    >
      <List.EmptyView
        icon={Icon.Bookmark}
        title="No saved filters"
        description="Save a GitHub search here and it becomes a category in the Pull Requests command."
        actions={<ActionPanel>{newAction}</ActionPanel>}
      />
      {config.filters.map((filter) => (
        <List.Item
          key={filter.name}
          icon={{ source: Icon.Bookmark, tintColor: Color.Yellow }}
          title={filter.name}
          detail={
            <List.Item.Detail
              markdown={[`### ${filter.name}`, "", "```", searchString(filter, config), "```"].join("\n")}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Role" text={filter.role || "—"} />
                  <List.Item.Detail.Metadata.Label title="Subject" text={filter.subject || "—"} />
                  <List.Item.Detail.Metadata.Label title="State" text={filter.state || "open"} />
                  <List.Item.Detail.Metadata.Label title="Scopes" text={filter.scopes?.join(" ") || "default"} />
                  <List.Item.Detail.Metadata.Label title="Extra" text={filter.extra || "—"} />
                  <List.Item.Detail.Metadata.Label title="Raw" text={filter.raw || "—"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Filter"
                target={
                  <FilterForm
                    config={config}
                    existing={filter}
                    onSave={(next, replacing) => update(withFilter(config, next, replacing))}
                  />
                }
              />
              {newAction}
              <Action.CopyToClipboard title="Copy Query" content={searchString(filter, config)} />
              <Action
                icon={Icon.Trash}
                title="Delete Filter"
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(filter)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
