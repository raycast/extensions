import { LaunchProps } from "@raycast/api";
import { CreateObjectForm, CreateObjectFormValues, EnsureAuthenticated } from "./components";

interface LaunchContext {
  defaults: {
    spaceId: string;
    typeId: string;
    templateId: string;
    listId: string;
    name: string;
    icon: string;
    description: string;
    body: string;
    source: string;
  };
}

interface CreateObjectProps
  extends LaunchProps<{ draftValues?: CreateObjectFormValues; launchContext?: LaunchContext }> {}

export default function Command(props: CreateObjectProps) {
  return (
    <EnsureAuthenticated viewType="form">
      <CreateObject {...props} />
    </EnsureAuthenticated>
  );
}

function CreateObject({ draftValues, launchContext }: CreateObjectProps) {
  const mergedValues = {
    ...launchContext?.defaults,
    ...draftValues, // `draftValues` takes precedence
  };

  return <CreateObjectForm draftValues={mergedValues} enableDrafts={true} />;
}
