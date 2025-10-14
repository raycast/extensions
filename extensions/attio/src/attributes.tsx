import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AttributeType } from "attio-js/dist/commonjs/models/components/attribute";
import { attio } from "./attio";

const ATTRIBUTE_ICONS: Partial<Record<AttributeType, Icon>> = {
    "text": Icon.Text,
    "domain": Icon.Globe,
    "location": Icon.Pin,
    "currency": Icon.BankNote,
    "date": Icon.Calendar,
    "timestamp": Icon.Clock
}
export default function Attributes({objectId}:{objectId: string}) {
    const {isLoading,data:attributes=[]} = usePromise(async() => {
        const {data} = await attio.attributes.list({target: "objects", identifier: objectId});
        return data
    })
    return <List isLoading={isLoading}>
{attributes.map(attribute => <List.Item key={attribute.id.attributeId} icon={ATTRIBUTE_ICONS[attribute.type]} title={attribute.title} subtitle={attribute.type} />)}
    </List>
}