import {
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Form,
  List,
  Detail,
  popToRoot,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { callApi } from "../api";
import { AccessTokenResource, ApiTokenResource } from "../types";

export default function AccountTokensTab({ tokens }: { tokens: ApiTokenResource[] }) {
  return (
    <List.Item
      icon={Icon.Key}
      title="API Tokens"
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {tokens.map((token, index) => (
                <List.Item.Detail.Metadata.Label
                  key={token.id}
                  title={`${index + 1} - ${token.name}`}
                  text={new Date(token.created_at).toDateString()}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Gear}
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Generate API Token"
            target={<UpdateTokens />}
          />
        </ActionPanel>
      }
    />
  );
}

function UpdateTokens() {
  const { push } = useNavigation();
  type FormValues = {
    name: string;
  };
  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Generating token", values.name);
      try {
        const result = (await callApi("account/tokens", {
          method: "POST",
          body: values,
        })) as AccessTokenResource;
        toast.style = Toast.Style.Success;
        toast.title = "Generated token";
        reset();
        push(
          <Detail
            markdown={`API Token was added \n\n Copy and securely store your API token. It won't be shown again for security reasons. \n\n---\n\n ${result.access_token}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy & Close"
                  content={result.access_token}
                  concealed
                  onCopy={() => popToRoot()}
                />
              </ActionPanel>
            }
          />,
        );
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not generate token";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Gear} title="Generate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="To access the API you need a token which acts like a combined username and password. All API tokens have the same read/write access as your account." />
      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
    </Form>
  );
}
