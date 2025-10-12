import { useCachedPromise, usePromise } from "@raycast/utils";
import { attio } from "./attio";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import Records from "./records";

export default function Objects() {
    const {isLoading,data: objects} = useCachedPromise(async()=> {
        const {data} = await attio.objects.list();
        return data;
    }, [], {initialData: []});
    return <List isLoading={isLoading}>
        {objects.map(object => <List.Item key={object.id.objectId} icon={Icon.Box} title={object.pluralNoun || ""} actions={<ActionPanel>
            <Action.Push title="Records" target={<Records objectId={object.id.objectId} />} />
            <Action.Push title="Attributes" target={<Attributes objectId={object.id.objectId} />} />
        </ActionPanel>} />)}
    </List>
}

function Attributes({objectId}:{objectId: string}) {
    const {isLoading,data:attributes=[]} = usePromise(async() => {
        const {data} = await attio.attributes.list({target: "objects", identifier: objectId});
        return data
    })
    return <List isLoading={isLoading}>
{attributes.map(attribute => <List.Item key={attribute.id.attributeId} title={attribute.title} />)}
    </List>
}