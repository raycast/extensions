import { usePromise } from "@raycast/utils";
import { AttributeValue, QueryRecordsResponse } from "./types";
import { attio } from "./attio";
import { Action, ActionPanel, Icon, List } from "@raycast/api";

function getValue(val: AttributeValue[]) {
    if (!val.length) return "-";
    const value = val.map(v => {
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
                if (!v.option) return "-"
                if (typeof v.option!=="object") return v.option;
                if ("title" in v.option) return v.option.title;
                if ("name" in v.option) return v.option.name;
                if ("value" in v.option) return v.option.value;
                return "?";
            }
            default:
                return "?";
        }
    })
    return value.join();
}
function buildMarkdown(values: {[attributeSlug: string]: AttributeValue[]}) {
    return `
| key | val |
|-----|-----|
${Object.entries(values).map(([key, val]) => `| ${key} | ${getValue(val)} |`).join(`\n`)}`;
}
export default function Records({objectId}:{objectId: string}) {
    const {isLoading,data:records=[]} = usePromise(async() => {
        // This crashes since web_url is passed so we bypass using a manual fetch
        // const {data} = await attio.records.query({object: objectId, requestBody: {}})

        const response = await fetch(new URL(`v2/objects/${objectId}/records/query`, attio._baseURL?.origin), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${attio._options.apiKey}`
            }
        })
        const result = await response.json();
        if (!response.ok) throw new Error((result as Error).message);
        const { data } = result as QueryRecordsResponse;
        return data;
    })
    return <List isLoading={isLoading} isShowingDetail>
{records.map((record, recordIndex) => <List.Item key={record.id.record_id} icon={Icon.Document} title={`${recordIndex+1}`} accessories={[{date: new Date(record.created_at)}]} detail={<List.Item.Detail markdown={buildMarkdown(record.values)} />} actions={<ActionPanel>
    <Action.OpenInBrowser url={record.web_url}/>
</ActionPanel>} />)}
    </List>
}