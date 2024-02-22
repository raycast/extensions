import type { LaunchProps } from "@raycast/api";

import { CreatePageForm, type CreatePageFormValues } from "./components/forms/CreatePageForm";

export default function Command(props: LaunchProps<{ launchContext?: CreatePageFormValues }>) {
  return <CreatePageForm defaults={props.launchContext} />;
}
