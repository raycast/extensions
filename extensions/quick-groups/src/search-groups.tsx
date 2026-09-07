import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { createExampleFile } from "./create-example";
import { displayValue, FieldActions, iconForAction, titleCase } from "./field-ui";
import { resolveGroupsDirectory } from "./groups-directory";
import { Diagnostic, ReferenceRecord } from "./model";
import { buildSearchIndex, searchRecords } from "./search";
import { useReferenceData } from "./use-reference-data";

function RecordView({ record }: { record: ReferenceRecord }) {
  return (
    <List
      navigationTitle={`${record.collection} / ${record.name}`}
      searchBarPlaceholder="Filter fields…"
    >
      {record.fields.map((field, index) => (
        <List.Item
          key={`${field.label}-${index}`}
          icon={{
            source: field.sensitive ? Icon.Lock : Icon.Dot,
            tintColor: field.sensitive ? Color.Orange : Color.SecondaryText,
          }}
          title={`${index < 10 ? (index + 1) % 10 : "·"}  ${titleCase(field.label)}`}
          subtitle={displayValue(field)}
          keywords={field.sensitive ? [field.label] : [field.label, ...field.values]}
          accessories={field.actions.map((action) => ({
            icon: iconForAction(action),
            tooltip: titleCase(action.kind),
          }))}
          actions={<FieldActions field={field} />}
        />
      ))}
    </List>
  );
}

function Diagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <List.Section title="Diagnostics" subtitle={`${diagnostics.length}`}>
      {diagnostics.map((diagnostic, index) => (
        <List.Item
          key={`${diagnostic.source}-${index}`}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title={diagnostic.message}
          subtitle={
            [diagnostic.collection, diagnostic.record].filter(Boolean).join(" / ") ||
            diagnostic.source.split("/").pop()
          }
          accessories={[
            {
              text: diagnostic.line
                ? `Line ${diagnostic.line}${diagnostic.column ? `:${diagnostic.column}` : ""}`
                : diagnostic.source.split("/").pop(),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Diagnostic"
                icon={Icon.Warning}
                target={<DiagnosticView diagnostic={diagnostic} />}
              />
              <Action.ShowInFinder path={diagnostic.source} />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function DiagnosticView({ diagnostic }: { diagnostic: Diagnostic }) {
  const location = diagnostic.line
    ? `Line ${diagnostic.line}${diagnostic.column ? `, column ${diagnostic.column}` : ""}`
    : "Location unavailable";
  const context = [diagnostic.collection, diagnostic.record].filter(Boolean).join(" / ");
  const markdown = [
    `# ${diagnostic.message}`,
    "",
    `**File:** \`${diagnostic.source}\`  `,
    `**Location:** ${location}`,
    context ? `  \n**Record:** ${context}` : "",
    diagnostic.snippet ? `\n\n## Source\n\n\`\`\`yaml\n${diagnostic.snippet}\n\`\`\`` : "",
    "\n\nFix the YAML and save it, then return to Quick Groups and choose **Reload Group Files**.",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      navigationTitle="YAML Diagnostic"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Source File" target={diagnostic.source} />
          <Action.ShowInFinder path={diagnostic.source} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { referenceDirectory } = getPreferenceValues<Preferences.SearchGroups>();
  const groupsDirectory = resolveGroupsDirectory(referenceDirectory);
  const { records, diagnostics, isLoading, reload } = useReferenceData(
    groupsDirectory.path,
    groupsDirectory.isDefault,
  );
  const [searchText, setSearchText] = useState("");
  const [collection, setCollection] = useState("__all__");

  const index = useMemo(() => buildSearchIndex(records), [records]);
  const collections = useMemo(
    () =>
      [...new Set(records.map((record) => record.collection))].sort((a, b) => a.localeCompare(b)),
    [records],
  );
  const matches = useMemo(
    () =>
      searchRecords(index, searchText).filter(
        (record) => collection === "__all__" || record.collection === collection,
      ),
    [collection, index, searchText],
  );

  async function createExample() {
    try {
      const file = await createExampleFile(groupsDirectory.path);
      await showToast({ style: Toast.Style.Success, title: "Created Example YAML", message: file });
      await reload(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Create Example YAML",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search names, IPs, URLs, ports…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Collection" value={collection} onChange={setCollection}>
          <List.Dropdown.Item title="All Collections" value="__all__" />
          {collections.map((name) => (
            <List.Dropdown.Item key={name} title={titleCase(name)} value={name} />
          ))}
        </List.Dropdown>
      }
      throttle
    >
      {!isLoading && matches.length === 0 && diagnostics.length === 0 ? (
        <List.EmptyView
          icon={Icon.Binoculars}
          title={records.length === 0 ? "No Group Records" : "No Matches"}
          description={
            records.length === 0
              ? "Add a .yaml or .yml file to your Groups directory."
              : "Try another fragment."
          }
          actions={
            <ActionPanel>
              {records.length === 0 ? (
                <Action title="Create Example YAML" icon={Icon.Document} onAction={createExample} />
              ) : null}
              <Action.Open title="Open Groups Directory" target={groupsDirectory.path} />
              <Action
                title="Reload Group Files"
                icon={Icon.ArrowClockwise}
                onAction={() => reload()}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Records" subtitle={`${matches.length}`}>
        {matches.map((record) => (
          <List.Item
            key={`${record.collection}/${record.name}`}
            icon={Icon.List}
            title={record.name}
            subtitle={record.collection}
            accessories={[
              { text: `${record.fields.length} field${record.fields.length === 1 ? "" : "s"}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Record"
                  icon={Icon.Sidebar}
                  target={<RecordView record={record} />}
                />
                <Action
                  title="Reload Group Files"
                  icon={Icon.ArrowClockwise}
                  onAction={() => reload()}
                />
                <Action.Open title="Edit Source" target={record.source} />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <Diagnostics diagnostics={diagnostics} />
    </List>
  );
}
