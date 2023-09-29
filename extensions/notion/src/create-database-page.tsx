import type { LaunchProps } from "@raycast/api";

import { View } from "./components";
import { CreatePageForm, type CreatePageFormValues } from "./components/forms/CreatePageForm";

export default function Command(props: LaunchProps<{ launchContext?: CreatePageFormValues }>) {
  return (
    <View>
      <CreatePageForm defaults={props.launchContext} />
    </View>
  );
}
