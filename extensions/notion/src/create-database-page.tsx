import type { LaunchProps, Form } from "@raycast/api";

import { CreatePageForm, View } from "./components";

type Props = LaunchProps<{
  launchContext?: {
    databaseId: string;
    [key: string]: Form.Value;
  };
}>;

export default function Command(props: Props) {
  const { databaseId, ...propertyDefaults } = props.launchContext ?? {};
  return (
    <View>
      <CreatePageForm databaseId={databaseId} defaults={propertyDefaults} />
    </View>
  );
}
