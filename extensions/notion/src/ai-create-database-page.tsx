import { AI, Detail, environment, Toast, type LaunchProps } from "@raycast/api";

import { getValues } from "./utils/ai";
import { createDatabasePage } from "./utils/notion";

type Props = LaunchProps<{
  arguments: Arguments.AiCreateDatabasePage;
  launchContext: { databaseId: string };
}>;

export default async function Command(props: Props) {
  if (!environment.canAccess(AI)) {
    return <Detail markdown="You need to Raycast Pro to use this command." />;
  }

  const databaseId = props.launchContext?.databaseId;
  const {res, toast} = await getValues(databaseId, props.arguments.conditions);
  console.log(res);
  toast.title = "creating page";

  const page = await createDatabasePage(res);
  toast.title = "done";
  toast.style = Toast.Style.Success;

}

// todo: need another command that actually creates the "AI command"
// setting the default values
// which ones leave blank
// prompt / template for generating page content
// etc
