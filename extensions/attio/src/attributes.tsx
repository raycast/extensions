import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AttributeType } from "attio-js/dist/commonjs/models/components/attribute";
import { attio } from "./attio";
import { getObjectTitle } from "./objects";
import { ObjectT } from "attio-js/dist/commonjs/models/components/object";

const ATTRIBUTE_ICONS: Partial<Record<AttributeType, Icon>> = {
  text: Icon.Text,
  domain: Icon.Globe,
  location: Icon.Pin,
  currency: Icon.BankNote,
  date: Icon.Calendar,
  timestamp: Icon.Clock,
};
export default function Attributes({ object }: { object: ObjectT }) {
  const { isLoading, data: attributes = [] } = useCachedPromise(
    async (objectId: string) => {
      const { data } = await attio.attributes.list({ target: "objects", identifier: objectId });
      return data;
    },
    [object.id.objectId],
  );
  return (
    <List isLoading={isLoading} navigationTitle={`Objects / ${getObjectTitle(object)} / Attributes`}>
      {attributes.map((attribute) => (
        <List.Item
          key={attribute.id.attributeId}
          icon={ATTRIBUTE_ICONS[attribute.type]}
          title={attribute.title}
          subtitle={attribute.type}
        />
      ))}
    </List>
  );
}
