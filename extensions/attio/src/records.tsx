import { useCachedPromise } from "@raycast/utils";
import { AttributeValue } from "./types";
import { queryRecords } from "./attio";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ObjectT } from "attio-js/dist/commonjs/models/components/object";
import { getObjectTitle } from "./objects";

const getValue = (val: AttributeValue[]) => {
  if (!val.length) return "-";
  const value = val.map((v) => {
    switch (v.attribute_type) {
      case "number":
      case "rating":
      case "text":
      case "timestamp":
      case "date":
        return v.value;
      case "checkbox":
        return v.value ? "✅" : "❌";
      case "currency":
        return v.currency_value;
      case "domain":
        return v.domain;
      case "email-address":
        return v.email_address;
      case "personal-name":
        return v.full_name;
      case "phone-number":
        return v.phone_number;
      case "status":
        return v.status;
      case "select": {
        if (!v.option) return "-";
        if (typeof v.option !== "object") return v.option;
        if ("title" in v.option) return v.option.title;
        if ("name" in v.option) return v.option.name;
        if ("value" in v.option) return v.option.value;
        return "?";
      }
      default:
        return "?";
    }
  });
  return value.join();
};
const buildMarkdown = (values: { [attributeSlug: string]: AttributeValue[] }) => {
  return `
| key | val |
|-----|-----|
${Object.entries(values)
  .map(([key, val]) => `| ${key} | ${getValue(val)} |`)
  .join(`\n`)}`;
};
export default function Records({ object }: { object: ObjectT }) {
  const {
    isLoading,
    data: records = [],
    error,
  } = useCachedPromise(
    async (objectId: string) => {
      const { data } = await queryRecords({ objectId });
      return data;
    },
    [object.id.objectId],
  );
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Objects / ${getObjectTitle(object)} / Records`}
      isShowingDetail={!!records.length}
    >
      {!isLoading && !records.length && !error ? (
        <List.EmptyView
          icon="empty/record.svg"
          title={`No ${object.singularNoun?.toLowerCase()} records`}
          description={`0 ${object.pluralNoun} records`}
        />
      ) : (
        records.map((record, recordIndex) => (
          <List.Item
            key={record.id.record_id}
            icon={Icon.Document}
            title={`${recordIndex + 1}`}
            accessories={[{ date: new Date(record.created_at) }]}
            detail={<List.Item.Detail markdown={buildMarkdown(record.values)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={record.web_url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
