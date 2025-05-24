import { Detail, ActionPanel, Action, Icon, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { useFetch, useForm, FormValidation } from "@raycast/utils";
import { generateApiUrl, API_HEADERS, callApi } from "../api";
import { UserResource } from "../types";

export default function AccountSettings() {
  const {
        isLoading,
        data: user
      } = useFetch(generateApiUrl("account"), {
        headers: API_HEADERS,
        mapResult(result: { data: UserResource }) {
          return {
            data: result.data,
          };
        }
      });

      return <Detail isLoading={isLoading} metadata={user && <Detail.Metadata>
        <Detail.Metadata.Label title="ID" text={user.id.toString()} />
        <Detail.Metadata.Label title="Email" text={user.email} />
        <Detail.Metadata.TagList title="Roles">
          {user.roles.map(role => <Detail.Metadata.TagList.Item key={role.id} text={role.name} />)}
        </Detail.Metadata.TagList>
      </Detail.Metadata>} actions={user && <ActionPanel>
        <Action.Push
                        icon={Icon.Pencil}
                        title="Update"
                        target={<UpdateSettings user={user} />}
                      />
      </ActionPanel>} />
}

function UpdateSettings({ user }: { user: UserResource }) {
  const {pop} = useNavigation();
  type FormValues = {
    password: string; language_id: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating account");
            try {
                callApi("account", {
                  method: "PATCH",
                  body: values
                });
              toast.style = Toast.Style.Success;
              toast.title = "Updated account";
              pop();
            } catch (error) {
              toast.style = Toast.Style.Failure;
              toast.title = "Could not update account";
              toast.message = `${error}`;
            }
    },
    validation: { 
      password: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
              <Action.SubmitForm icon={Icon.Check} title="Save" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description title="Email" text={user.email} />
    <Form.PasswordField title="Password" placeholder="hunter2" info="8 characters, 1 uppercase letter, 1 number" {...itemProps.password} />
    <Form.Dropdown title="Interface Language" {...itemProps.language_id}>
      <Form.Dropdown.Item icon={user.language.icon.url} title={user.language.name} value={user.language.id.toString()} />
    </Form.Dropdown>
  </Form>
}