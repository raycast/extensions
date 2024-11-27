import { CreateOrEditRebound, CreateOrEditReboundProps } from "./createOrEditRebound";

export type EditReboundProps = CreateOrEditReboundProps;

export function EditRebound(props: EditReboundProps) {
  return <CreateOrEditRebound {...props} />;
}
