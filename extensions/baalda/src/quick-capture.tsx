import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showHUD, showToast, Keyboard } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { BaaldaError, capturePath, createNote, listVaults, resolveVaultId, type Vault } from "./lib/baalda";

export default function QuickCapture() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(true);

  useEffect(() => {
    listVaults()
      .then(setVaults)
      .catch((e: unknown) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load vaults",
          message: e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => setLoadingVaults(false));
  }, []);

  const { handleSubmit, itemProps } = useForm<{ title: string; content: string; vaultId: string }>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Capturing to Baalda…" });
      try {
        const vault = await resolveVaultId(values.vaultId || undefined);
        const title = values.title.trim();
        const { relPath } = capturePath(title);
        const body = `# ${title}\n\n${values.content.trim()}\n`;
        await createNote({ vaultId: vault.vaultId, relPath, title, content: body });
        await toast.hide();
        await showHUD(`✓ Captured to ${vault.name}: ${relPath}`);
        await popToRoot();
      } catch (e) {
        if (e instanceof BaaldaError && /already exists|conflict|EEXIST/i.test(e.message)) {
          // Same slug today. Fall back to a timestamped filename so capture never fails.
          try {
            const vault = await resolveVaultId(values.vaultId || undefined);
            const title = values.title.trim();
            const now = new Date();
            const { relPath } = capturePath(`${title} ${now.toTimeString().slice(0, 8).replaceAll(":", "")}`);
            await createNote({
              vaultId: vault.vaultId,
              relPath,
              title,
              content: `# ${title}\n\n${values.content.trim()}\n`,
            });
            await toast.hide();
            await showHUD(`✓ Captured to ${vault.name}: ${relPath}`);
            await popToRoot();
            return;
          } catch (e2) {
            toast.style = Toast.Style.Failure;
            toast.title = "Capture failed";
            toast.message = e2 instanceof Error ? e2.message : String(e2);
            return;
          }
        }
        toast.style = Toast.Style.Failure;
        toast.title = "Capture failed";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    },
    validation: {
      title: FormValidation.Required,
    },
    initialValues: { vaultId: "" },
  });

  return (
    <Form
      isLoading={loadingVaults}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture Note" icon={Icon.Paperclip} onSubmit={handleSubmit} />
          {vaults.length > 0 && (
            <Action.CopyToClipboard
              title="Copy Default Vault ID"
              icon={Icon.Key}
              content={vaults[0].vaultId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="What's on your mind?" {...itemProps.title} autoFocus />
      <Form.TextArea title="Content" placeholder="Markdown body (optional)…" {...itemProps.content} />
      {vaults.length > 1 ? (
        <Form.Dropdown
          title="Vault"
          storeValue
          {...itemProps.vaultId}
          info="Stored per-capture; set a Default Vault ID in preferences to skip this"
        >
          {vaults.map((v) => (
            <Form.Dropdown.Item key={v.vaultId} value={v.vaultId} title={v.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.Description text="Saves as YYYY-MM-DD-<slug>.md in your capture folder (preferences), e.g. Inbox/. Title becomes the note's H1." />
    </Form>
  );
}
