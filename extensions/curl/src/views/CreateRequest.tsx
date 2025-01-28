import { CreateOrEditRequest, CreateOrEditRequestProps } from "./CreateOrEditRequest";

export type CreateRequestProps = Omit<CreateOrEditRequestProps, "request">;

export function CreateRequest(props: Readonly<CreateRequestProps>) {
  return <CreateOrEditRequest {...props} />;
}
