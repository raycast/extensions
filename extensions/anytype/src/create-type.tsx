import { CreateTypeForm, CreateTypeFormProps, EnsureAuthenticated } from "./components";
import { TypeLayout } from "./models";

export default function Command({ draftValues }: CreateTypeFormProps) {
  const defaultValues = {
    key: "",
    spaceId: "",
    name: "",
    plural_name: "",
    icon: "",
    layout: TypeLayout.Basic,
    properties: [],
    ...draftValues,
  };

  return (
    <EnsureAuthenticated viewType="form">
      <CreateTypeForm draftValues={defaultValues} enableDrafts={true} />
    </EnsureAuthenticated>
  );
}
