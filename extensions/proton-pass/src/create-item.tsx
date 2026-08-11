import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ItemDetail } from "./items/item-detail";
import type { Vault } from "./vaults/vaults";
import { modules } from "./raycast/create-modules";

type Values = { vault: string; title: string; username: string; email: string; password: string; url: string };

export default function Command() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    modules.session
      .getStatus()
      .then(async (status) => {
        if (status.state === "ready") setVaults(await modules.vaults.list());
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function submit(values: Values) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating login" });
    try {
      const item = await modules.items.createLogin({
        shareId: values.vault,
        title: values.title.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        url: values.url.trim(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Login created";
      item.vaultName = vaults.find((vault) => vault.shareId === values.vault)?.name || "";
      push(<ItemDetail item={item} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to create login";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Login" icon={Icon.Plus} onSubmit={submit} />
          <Action
            title="Generate Password"
            icon={Icon.Key}
            onAction={async () =>
              setPassword(
                await modules.passwords.generate({ length: 20, uppercase: true, numbers: true, symbols: true }),
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="vault" title="Vault">
        {vaults.map((vault) => (
          <Form.Dropdown.Item key={vault.shareId} value={vault.shareId} title={vault.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="GitHub" />
      <Form.TextField id="username" title="Username" />
      <Form.TextField id="email" title="Email" />
      <Form.PasswordField id="password" title="Password" value={password} onChange={setPassword} />
      <Form.TextField id="url" title="URL" placeholder="https://example.com" />
    </Form>
  );
}
