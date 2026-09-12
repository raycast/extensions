import { useState } from "react";
import { getUserDatabases } from "../utils/hestia";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { getTextAndIconFromVal } from "../utils";
import { FormValidation, useForm } from "@raycast/utils";
import { DB_PASS_REGEX } from "../constants";
import { AddDatabaseFormValues } from "../types/databases";
import useHestia from "../utils/hooks/useHestia";

type ListDatabasesComponentProps = {
  user: string;
};
export default function ListDatabasesComponent({ user }: ListDatabasesComponentProps) {
  const { isLoading, data: databases, revalidate } = getUserDatabases(user);

  return (
    <List navigationTitle={`Users / ${user} / Databases`} isLoading={isLoading} isShowingDetail>
      {databases &&
        Object.entries(databases).map(([database, data]) => (
          <List.Item
            key={database}
            title={database}
            icon={{ source: Icon.Coin, tintColor: data.SUSPENDED === "yes" ? Color.Yellow : Color.Green }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.entries(data).map(([key, val]) => {
                      const { text: iconText, icon } = getTextAndIconFromVal(val);
                      let text = iconText;
                      if (key === "U_DISK") text += " mb";
                      return <List.Item.Detail.Metadata.Label key={key} title={key} text={text} icon={icon} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add Database"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Database"
                  icon={Icon.Plus}
                  target={<AddDatabase user={user} onDatabaseAdded={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type AddDatabaseProps = {
  user: string;
  onDatabaseAdded: () => void;
};
function AddDatabase({ user, onDatabaseAdded }: AddDatabaseProps) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<AddDatabaseFormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      database: FormValidation.Required,
      db_user(value) {
        if (!value) return "The item is required";
        else if (user.concat("_", value).length > 32) return "The item must be less than 32 characters";
      },
      db_pass(value) {
        if (!value) return "The item is required";
        else if (value.length < 8) return "The item must be at least 8 characters";
        else if (!DB_PASS_REGEX.test(value)) return "The item is invalid";
      },
    },
  });

  const { isLoading } = useHestia<Record<string, never>>("v-add-database", "Adding Database", {
    body: [user, values.database, values.db_user, values.db_pass],
    execute,
    async onData() {
      await showToast({
        title: "SUCCESS",
        message: `Added ${values.database}`,
      });
      onDatabaseAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });

  return (
    <Form
      navigationTitle="Add Database"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Prefix ${user}_ will be automatically added to database name and database user`} />
      <Form.TextField title="Database" placeholder="wordpress_db" {...itemProps.database} />
      <Form.TextField
        title="Username"
        placeholder="wp_user"
        {...itemProps.db_user}
        info="Maximum 32 characters length, including prefix"
      />
      <Form.PasswordField title="Password" placeholder="Hunter2_" {...itemProps.db_pass} />
      <Form.Description
        text={`Your password must have at least:
    8 characters
    1 uppercase & 1 lowercase character
    1 number
`}
      />
    </Form>
  );
}
