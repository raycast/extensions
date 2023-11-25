import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import CreateIssueForm, { CreateIssueValues } from "./components/CreateIssueForm";
import View from "./components/View";

function Form({ draftValues }: { draftValues?: CreateIssueValues }) {
  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();
  const { users, isLoadingUsers } = useUsers();

  return (
    <CreateIssueForm
      isLoading={isLoadingPriorities || isLoadingMe || isLoadingUsers}
      priorities={priorities}
      users={users}
      me={me}
      enableDrafts={true}
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
