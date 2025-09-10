import { LaunchProps } from "@raycast/api";
import { CreateTicketForm } from "./components";

export interface CreateTicketArguments {
  subject?: string;
  description?: string;
}

export default function CreateTicket(props: LaunchProps<{ arguments: CreateTicketArguments }>) {
  return (
    <CreateTicketForm
      initialValues={{
        subject: props.arguments?.subject || "",
        description: props.arguments?.description || "",
      }}
    />
  );
}
