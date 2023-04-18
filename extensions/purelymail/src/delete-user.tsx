import {
  ActionPanel,
  Form,
  Action,
  Toast,
  popToRoot,
  showToast,
  Detail,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { DeleteUserRequest, Response } from "./utils/types";
import { deleteUser } from "./utils/api";

interface State {
  isLoading?: boolean;
  error: string;
}

export default function DeleteUser() {
  const [state, setState] = useState<State>({
    isLoading: false,
    error: "",
  });

  const { handleSubmit, itemProps } = useForm<DeleteUserRequest>({
    async onSubmit(values) {
      setState((prevState) => {
        return { ...prevState, isLoading: true };
      });

      const response: Response = await deleteUser(values.userName);
      switch (response.type) {
        case "error":
          await showToast(Toast.Style.Failure, "Purelymail Error", response.message);

          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          await showToast(
            Toast.Style.Success,
            "User Deleted",
            "User deleted successfully from your Purelymail account."
          );
          popToRoot({ clearSearchBar: true });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    },
    validation: {
      userName: FormValidation.Required,
    },
  });

  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <Form
      isLoading={state.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete User" icon={Icon.RemovePerson} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        autoFocus
        info="Enter username to delete it from your Purelymail account."
        title="Username"
        placeholder="hi@example.com"
        {...itemProps.userName}
      />
      <Form.Description title="Warning" text="This will also delete the user's mailbox." />
    </Form>
  );
}
