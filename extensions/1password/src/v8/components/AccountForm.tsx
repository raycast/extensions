import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";

import { Items } from "./Items";
import { Guide } from "./Guide";
import { op, useAccounts } from "../utils";
import { useCachedState } from "@raycast/utils";

export function AccountForm() {
  const [hasAccount, setHasAccount] = useCachedState<boolean | undefined>("@account", false);
  const { data, error, isLoading } = useAccounts();

  if (error) return <Guide />;
  if (hasAccount) return <Items />;
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Sign In"
            icon={Icon.Key}
            onSubmit={async (values) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Signing in...",
              });

              try {
                op(["signin", "--account", values.account]);
                setHasAccount(true);

                toast.style = Toast.Style.Success;
                toast.title = "Signed in";
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to sign in";
                if (error instanceof Error) {
                  toast.message = error.message;
                  toast.primaryAction = {
                    title: "Copy logs",
                    onAction: async (toast) => {
                      await Clipboard.copy((error as Error).message);
                      toast.hide();
                    },
                  };
                }
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="account" title="Account" autoFocus>
        {(data || []).map((account) => (
          <Form.Dropdown.Item
            key={account.account_uuid}
            title={`${account.url} - ${account.email}`}
            value={account.account_uuid}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
