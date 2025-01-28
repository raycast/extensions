import { CreateOrEditRequest, CreateOrEditRequestProps } from "./CreateOrEditRequest";

export type EditRequestProps = CreateOrEditRequestProps;

export function EditRequest(props: EditRequestProps) {
  return <CreateOrEditRequest {...props} />;
}
