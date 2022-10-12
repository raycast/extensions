import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { find, getObjects, SfObject, SfRecord } from "./salesforce/search";
import { keysOf } from "./util/collections";

export default function Command() {
  const [query, setQuery] = useState("");
  const [filterObjectName, setFilterObjectName] = useState<string | undefined>(undefined);
  const { data: objects } = usePromise(getObjects, []);
  const { isLoading, data: records } = usePromise(find, [
    query,
    filterObjectName && filterObjectName !== "" ? filterObjectName : undefined,
  ]);

  const filterList =
    objects && objects.length > 0 ? <FilterList objects={objects} onChange={setFilterObjectName} /> : undefined;
  const sections = records && objects ? recordSections(records, objects) : undefined;
  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Salesforce"
      searchBarAccessory={filterList}
      throttle
    >
      {sections?.map((section) => (
        <List.Section key={section.object.apiName} title={section.object?.labelPlural}>
          {section?.records?.map((record) => (
            <RecordItem key={record.id} record={record} object={section.object} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function FilterList({ objects, onChange }: { objects: SfObject[]; onChange: (objectApiName: string) => void }) {
  const sortedByLabel = objects.sort((a, b) => a.labelPlural.localeCompare(b.labelPlural));
  const categoryItems = (category: SfObject["category"]) =>
    sortedByLabel.filter((o) => o.category === category).map((obj) => <FilterItem key={obj.apiName} object={obj} />);
  const recordObjects = categoryItems("record");
  const reportingObjects = categoryItems("reporting");
  return (
    <List.Dropdown tooltip="Filter Results by Type" storeValue={true} onChange={onChange}>
      <List.Dropdown.Item title="All object types" value="" icon={Icon.StarCircle} />
      <List.Dropdown.Section title={"Reporting"} children={reportingObjects} />
      <List.Dropdown.Section title={"Record Types"} children={recordObjects} />
    </List.Dropdown>
  );
}

function FilterItem({ object }: { object: SfObject }) {
  return (
    <List.Dropdown.Item
      title={object.labelPlural}
      value={object.apiName}
      icon={{
        source: object.iconUrl,
        tintColor: object.iconColor,
      }}
    />
  );
}

function RecordItem({ record, object }: { record: SfRecord; object?: SfObject }) {
  return (
    <List.Item
      title={record.name}
      subtitle={record.subtitle}
      icon={
        object
          ? {
              source: object.iconUrl,
              tintColor: object.iconColor,
            }
          : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={record.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

type RecordSection = { object: SfObject; records: SfRecord[] };

function recordSections(records: SfRecord[], objects: SfObject[]): RecordSection[] {
  const sectionKeys = keysOf(records, (rec) => rec.objectApiName);
  const sections = sectionKeys.map((key) => ({
    object: objects.find((o) => o.apiName === key)!, // eslint-disable-line
    records: records.filter((r) => r.objectApiName === key),
  }));
  const compare = (a: RecordSection, b: RecordSection) => {
    if (a.object.category !== b.object.category) {
      return a.object.category === "reporting" ? -1 : 1;
    } else {
      return a.object.apiName.localeCompare(b.object.apiName);
    }
  };
  return sections.sort(compare);
}
