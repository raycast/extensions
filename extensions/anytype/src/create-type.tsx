import { CreateTypeForm, CreateTypeFormProps, EnsureAuthenticated } from "./components";

export default function Command({ draftValues }: CreateTypeFormProps) {
  return (
    <EnsureAuthenticated viewType="form">
      <CreateTypeForm draftValues={draftValues} enableDrafts={true} />
    </EnsureAuthenticated>
  );
}
