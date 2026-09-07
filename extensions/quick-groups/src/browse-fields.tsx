import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { groupFields, FieldGroup } from "./browse-index";
import { displayValue, FieldActions, titleCase } from "./field-ui";
import { resolveGroupsDirectory } from "./groups-directory";
import { useReferenceData } from "./use-reference-data";

function FieldValues({ group }: { group: FieldGroup }) {
  return (
    <List
      navigationTitle={titleCase(group.label)}
      searchBarPlaceholder={`Search ${titleCase(group.label)} values…`}
    >
      {group.occurrences.map(({ field, record }, index) => (
        <List.Item
          key={`${record.collection}/${record.name}/${index}`}
          icon={{
            source: field.sensitive ? Icon.Lock : Icon.Dot,
            tintColor: field.sensitive ? Color.Orange : Color.SecondaryText,
          }}
          title={displayValue(field)}
          subtitle={`${record.collection} / ${record.name}`}
          keywords={field.sensitive ? [record.collection, record.name] : field.values}
          actions={<FieldActions field={field} />}
        />
      ))}
    </List>
  );
}

export default function Command() {
  const { referenceDirectory } = getPreferenceValues<Preferences.BrowseFields>();
  const groupsDirectory = resolveGroupsDirectory(referenceDirectory);
  const { records, diagnostics, isLoading, reload } = useReferenceData(
    groupsDirectory.path,
    groupsDirectory.isDefault,
  );
  const groups = groupFields(records);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search field names…">
      {!isLoading && groups.length === 0 && diagnostics.length === 0 ? (
        <List.EmptyView
          icon={Icon.Binoculars}
          title="No Group Fields"
          description="Add records to your Quick Groups YAML files."
          actions={
            <ActionPanel>
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
      <List.Section title="Fields" subtitle={`${groups.length}`}>
        {groups.map((group) => (
          <List.Item
            key={group.label}
            icon={Icon.Tag}
            title={titleCase(group.label)}
            accessories={[
              {
                text: `${group.occurrences.length} record${group.occurrences.length === 1 ? "" : "s"}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Values"
                  icon={Icon.List}
                  target={<FieldValues group={group} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {diagnostics.length > 0 ? (
        <List.Section title="Diagnostics" subtitle={`${diagnostics.length}`}>
          {diagnostics.map((diagnostic, index) => (
            <List.Item
              key={`${diagnostic.source}-${index}`}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title={diagnostic.message}
              subtitle={diagnostic.source.split("/").pop()}
              accessories={diagnostic.line ? [{ text: `Line ${diagnostic.line}` }] : []}
              actions={
                <ActionPanel>
                  <Action.Open title="Open Source File" target={diagnostic.source} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
