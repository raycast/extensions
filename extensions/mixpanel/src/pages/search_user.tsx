import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import findUsers from "../api/mixpanel_api";
import UserDetail from "./user_detail";
import UserList from "./user_list";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

export default function SearchByEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ email_field: string }>({
    async onSubmit(values) {
      const query = values.email_field;

      setIsLoading(true);
      try {
        const users = await findUsers(query);
        if (!users.length) throw new Error("No results");
        if (users.length > 1) push(<UserList users={users} />);
        else if (users.length == 1) push(<UserDetail user={users[0]} />);
      } catch (error) {
        await showFailureToast(error, { title: `No users found with "${query}"` });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      email_field: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} title="Search" />
        </ActionPanel>
      }
    >
      <Form.Description title="Description" text="Find a user in your Mixpanel project given name or email" />
      <Form.TextField
        autoFocus={true}
        title="Email or Name"
        placeholder="john OR john@doe.invalid"
        info="Search a user by email or name"
        {...itemProps.email_field}
      />
    </Form>
  );
}
