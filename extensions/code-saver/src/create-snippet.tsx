import { LaunchProps } from "@raycast/api";
import UpsertSnippetEntry, { SnippetValues } from "./components/creation/snippet-entry";
import { InitWrapper } from "./components/init/init-wrapper";

export default function CreateSnippet(props: LaunchProps<{ draftValues: SnippetValues }>) {
  const { draftValues } = props;
  return (
    <InitWrapper>
      <UpsertSnippetEntry props={draftValues} />
    </InitWrapper>
  );
}
