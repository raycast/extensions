import { CreateOrEditRebound, CreateOrEditReboundProps } from "./createOrEditRebound";

export type CreateReboundProps = Omit<CreateOrEditReboundProps, "rebound">;

export function CreateRebound(props: Readonly<CreateReboundProps>) {
  return <CreateOrEditRebound {...props} />;
}
