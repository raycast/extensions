import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { Profile, PROFILES, profile as findProfile } from "../lib/people";
import { flag } from "../lib/types";

export interface RecordField {
  id: string;
  section: string;
  title: string;
  value: string | undefined;
  icon?: Image.ImageLike;
  tag?: { value: string; color: Color };
}

interface Props<T> {
  /** Builds a fresh record for the selected country profile. */
  create: (profile: Profile) => T;
  fields: (record: T) => RecordField[];
  /** Plain-text block for "Copy All". */
  toText: (record: T) => string;
  toJson: (record: T) => unknown;
  searchBarPlaceholder: string;
  dropdownId: string;
}

interface Current<T> {
  profileId: string;
  record: T;
}

export function RecordList<T>({ create, fields, toText, toJson, searchBarPlaceholder, dropdownId }: Props<T>) {
  const [current, setCurrent] = useState<Current<T>>();
  const regenerate = (profileId: string) => setCurrent({ profileId, record: create(findProfile(profileId)) });
  // Every copy rolls a new record, so the next copy is always fresh.
  const onCopy = () => current && regenerate(current.profileId);

  const record = current?.record;
  const rows = record ? fields(record).filter((f) => f.value) : [];
  const sections = new Map<string, RecordField[]>();
  for (const row of rows) sections.set(row.section, [...(sections.get(row.section) ?? []), row]);

  return (
    <List
      isLoading={!record}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        <List.Dropdown id={dropdownId} tooltip="Country" storeValue onChange={regenerate}>
          {PROFILES.map((p) => (
            <List.Dropdown.Item key={p.id} title={p.name} value={p.id} icon={flag(p.iso)} keywords={[p.iso]} />
          ))}
        </List.Dropdown>
      }
    >
      {record &&
        [...sections.entries()].map(([section, sectionRows]) => (
          <List.Section key={section} title={section}>
            {sectionRows.map((row) => (
              <List.Item
                key={row.id}
                icon={row.icon}
                title={row.value!}
                subtitle={row.title}
                keywords={[row.title]}
                accessories={row.tag ? [{ tag: row.tag }] : undefined}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title={`Copy ${row.title}`} content={row.value!} onCopy={onCopy} />
                      <Action.Paste title="Paste into Active App" content={row.value!} onPaste={onCopy} />
                      <Action.CopyToClipboard
                        title="Copy All as Text"
                        content={toText(record)}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                        onCopy={onCopy}
                      />
                      <Action.CopyToClipboard
                        title="Copy All as JSON"
                        content={JSON.stringify(toJson(record), null, 2)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
                        onCopy={onCopy}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Regenerate"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={() => current && regenerate(current.profileId)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
