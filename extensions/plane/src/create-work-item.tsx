import AuthorizedView from "./components/AuthorizedView";
import CreateWorkItemForm, { CreateWorkItemFormValues } from "./components/CreateWorkItemForm";

function Form({ draftValues }: { draftValues?: CreateWorkItemFormValues }) {
  return <CreateWorkItemForm draftValues={draftValues} enableDrafts={false} />;
}

export default function Command({ draftValues }: { draftValues?: CreateWorkItemFormValues }) {
  return (
    <AuthorizedView>
      <Form draftValues={draftValues} />
    </AuthorizedView>
  );
}
