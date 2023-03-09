import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import findUsers from "../api/mixpanel_api";
import UserDetail from "./user_detail";
import UserList from "./user_list";

export default function SearchByEmail() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function onFormSubmit(_: any) {
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
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onFormSubmit} title="Search" />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Description"
        text="Find a user present in your mixpanel project given his name or email"
      />
      <Form.TextField
        id="email_field"
        onChange={setQuery}
        autoFocus={true}
        title="Email or name"
        info="Search a user by his email or name"
      />
    </Form>
  );
}
