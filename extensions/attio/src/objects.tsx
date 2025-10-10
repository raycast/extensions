import { useCachedPromise } from "@raycast/utils";
import { attio } from "./attio";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
// import { PostV2ObjectsObjectRecordsQueryResponse } from "attio-js/dist/commonjs/models/operations/postv2objectsobjectrecordsquery";

export default function Objects() {
    const {isLoading,data: objects} = useCachedPromise(async()=> {
        const {data} = await attio.objects.list();
        return data;
    }, [], {initialData: []});
    return <List isLoading={isLoading}>
        {objects.map(object => <List.Item key={object.id.objectId} icon={Icon.Box} title={object.pluralNoun || ""} actions={<ActionPanel>
            {/* <Action.Push title="Records" target={<Records objectId={object.id.objectId} />} /> */}
            <Action.Push title="Attributes" target={<Attributes objectId={object.id.objectId} />} />
        </ActionPanel>} />)}
    </List>
}

// function Records({objectId}:{objectId: string}) {
//     const {isLoading,data:records} = useCachedPromise(async() => {
//         const response = await fetch(new URL(`v2/objects/${objectId}/records/query`, attio._baseURL?.origin), {
//             method: "POST",
//             headers: {
//                 Authorization: `Bearer ${attio._options.apiKey}`
//             }
//         })
//         const result = await response.json();
//         if (!response.ok) throw new Error((result as Error).message);
//         const mapped = result.data.map(d => ({
//             id: {
//                 workspaceId: d.workspace_id,
//                 objectId: d.object_id,
//                 recordId: d.record_id
//             },
//             createdAt: d.created_at,
//             values: d.values
//         }))
//         const { data } = mapped;
//         return mapped as PostV2ObjectsObjectRecordsQueryResponse["data"];
        
//     },[],{initialData:[]})
//     return <List isLoading={isLoading}>
// {records.map(record => <List.Item key={record.id.recordId} title={record.createdAt} />)}
//     </List>
// }
function Attributes({objectId}:{objectId: string}) {
    const {isLoading,data:attributes} = useCachedPromise(async() => {
        const {data} = await attio.attributes.list({target: "objects", identifier: objectId});
        return data
    },[],{initialData:[]})
    return <List isLoading={isLoading}>
{attributes.map(attribute => <List.Item key={attribute.id.attributeId} title={attribute.title} />)}
    </List>
}