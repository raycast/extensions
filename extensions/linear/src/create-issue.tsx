import CreateIssueForm, { CreateIssueValues } from "./components/CreateIssueForm";
import View from "./components/View";
import useMe from "./hooks/useMe";
import usePriorities from "./hooks/usePriorities";

function Form({ draftValues }: { draftValues?: CreateIssueValues }) {
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  return (
    <CreateIssueForm
      isLoading={isLoadingPriorities || isLoadingMe}
      priorities={priorities}
      me={me}
      enableDrafts
      draftValues={draftValues}
    />
  );
}

export default function Command({ draftValues }: { draftValues?: CreateIssueValues }) {
  return (
    <View>
      <Form draftValues={draftValues} />
    </View>
  );
}
