import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import findUsers from "../api/mixpanel_api";
import UserDetail from "./user_detail";
import UserList from "./user_list";
import { FormValidation, useForm } from "@raycast/utils";

export default function SearchByEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ email_field: string }>({
    async onSubmit(values) {
      const query = values.email_field;
      
      setIsLoading(true);
      const users = await findUsers(query);
      setIsLoading(false);
      if (users.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: `No users found with ${query}`,
        });
      }
      if (users.length > 1) push(<UserList users={users} />);
      else if (users.length == 1) push(<UserDetail user={users[0]} />);
    },
    validation: {
      email_field: FormValidation.Required
    }
  })

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Search" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Description"
        text="Find a user present in your mixpanel project given his name or email"
      />
      <Form.TextField
        autoFocus={true}
        title="Email or Name"
        placeholder="john OR john@doe.invalid"
        info="Search a user by his email or name"
        {...itemProps.email_field}
      />
    </Form>
  );
}
