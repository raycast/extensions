import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { API_HEADERS, API_URL, parseResponse, useMailerSendPaginated } from "./mailersend";
import { Token, TokenScopeType } from "./interfaces";
import dayjs from "dayjs";
import { MutatePromise, useForm } from "@raycast/utils";

export default function Tokens() {
  const { isLoading, data: tokens, mutate } = useMailerSendPaginated<Token>("token");

  function generateSubtitle(token: Token) {
    const { scopes } = token;
    let scopeText = "Custom access";
    if (scopes.length === 1 && scopes[0] === TokenScopeType.EMAIL_FULL) scopeText = "Sending access";
    else {
      const fullScopes = Object.values(TokenScopeType).filter((scope) => scope.includes("_full"));
      if (fullScopes.every((scope) => scopes.includes(scope))) scopeText = "Full access";
    }

    const dateText = dayjs(token.created_at).format("YYYY-MM-DD");
    return `${scopeText} ・ ${dateText}`;
  }

  async function toggle(token: Token) {
    const toast = await showToast(Toast.Style.Animated, token.status === "pause" ? "Unpausing" : "Pausing");
    const newStatus = token.status === "pause" ? "unpause" : "pause";
    try {
      await mutate(
        fetch(API_URL + `token/${token.id}/settings`, {
          method: "PUT",
          headers: API_HEADERS,
          body: JSON.stringify({
            status: newStatus,
          }),
        }).then(parseResponse),
        {
          optimisticUpdate(data) {
            return data.map((t) => (t.id === token.id ? { ...t, status: newStatus } : t));
          },
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = newStatus === "pause" ? "Paused" : "Unpaused";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {tokens.map((token) => (
        <List.Item
          key={token.id}
          icon={
            token.status === "unpause"
              ? { value: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Active" }
              : { value: { source: Icon.Dot, tintColor: Color.Red }, tooltip: "Inactive" }
          }
          title={token.name}
          subtitle={generateSubtitle(token)}
          accessories={[{ icon: Icon.Globe, text: token.domain?.name ?? "All" }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.TextCursor}
                title="Rename Token"
                target={<RenameToken token={token} mutate={mutate} />}
              />
              {token.status === "pause" ? (
                <Action icon={Icon.Play} title="Unpause Token" onAction={() => toggle(token)} />
              ) : (
                <Action icon={Icon.Pause} title="Pause Token" onAction={() => toggle(token)} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RenameToken({ token, mutate }: { token: Token; mutate: MutatePromise<Token[]> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Renaming");
      try {
        await mutate(
          fetch(API_URL + `token/${token.id}`, {
            method: "PUT",
            headers: API_HEADERS,
            body: JSON.stringify({
              name: values.name,
            }),
          }).then(parseResponse),
          {
            optimisticUpdate(data) {
              return data.map((t) => (t.id === token.id ? { ...t, name: values.name } : t));
            },
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Renamed";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: token.name,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.TextCursor} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder={token.name} {...itemProps.name} />
    </Form>
  );
}
