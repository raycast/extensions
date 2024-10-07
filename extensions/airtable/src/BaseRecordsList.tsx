import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchBaseRecords } from "./metadata-api";

export function AirtableBaseRecordsList(props: { baseId: string; tableId: string }) {
  const { isLoading, data: records } = useCachedPromise(
    async () => await fetchBaseRecords(props.baseId, props.tableId),
    [],
    {
      initialData: [],
    }
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {records.map((record, recordIndex) => (
        <List.Item
          key={record.id}
          title={recordIndex.toString()}
          detail={
            <List.Item.Detail
              markdown={`| key | val |
|------|-----|
${Object.entries(record.fields)
  .map(([key, val]) => `| ${key} | ${val instanceof Array ? val.join(", ") : String(val)} |`)
  .join(`\n`)}`}
            />
          }
        />
      ))}
    </List>
  );
}
