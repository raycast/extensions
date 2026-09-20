import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showHUD, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ROOT_FOLDER, createNote, listFolders, listVaults, prefs, type Folder, type Vault } from "./lib/baalda";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function chooseDefaultVault(vaults: Vault[], preferredOverride?: string): string {
  const preferred = (preferredOverride ?? prefs().defaultVaultId)?.trim().toLowerCase();
  return (
    (preferred &&
      vaults.find((vault) => vault.vaultId.toLowerCase() === preferred || vault.name.toLowerCase() === preferred)
        ?.vaultId) ??
    vaults[0]?.vaultId ??
    ""
  );
}

function markdownFileName(value: string): string {
  const name = value.trim().replace(/^\/+/, "");
  if (!name) return "note.md";
  return /\.md$/i.test(name) ? name : `${name}.md`;
}

export function CreateNoteForm({ defaultVaultId }: { defaultVaultId?: string } = {}) {
  const { data: vaults, isLoading: loadingVaults } = useCachedPromise(listVaults, [], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load vaults",
        message: errorMessage(error),
      }),
  });
  const [vaultId, setVaultId] = useState("");
  const [folderId, setFolderId] = useState(ROOT_FOLDER);

  useEffect(() => {
    if (!vaultId && vaults?.length) setVaultId(chooseDefaultVault(vaults, defaultVaultId));
  }, [defaultVaultId, vaultId, vaults]);

  useEffect(() => {
    setFolderId(ROOT_FOLDER);
  }, [vaultId]);

  const { data: folders, isLoading: loadingFolders } = useCachedPromise(
    (id: string) => (id ? listFolders(id) : Promise.resolve([] as Folder[])),
    [vaultId],
    {
      onError: (error) =>
        void showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load folders",
          message: errorMessage(error),
        }),
    },
  );
  const { handleSubmit, itemProps } = useForm<{
    fileName: string;
    title: string;
    content: string;
  }>({
    initialValues: { fileName: "", title: "", content: "" },
    validation: { fileName: FormValidation.Required },
    async onSubmit(values) {
      const fileName = markdownFileName(values.fileName);
      const folder = folders?.find((candidate) => candidate.folderId === folderId);
      const relPath = folder ? `${folder.path}/${fileName}` : fileName;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating note…" });
      try {
        const result = await createNote({
          vaultId,
          relPath,
          title: values.title.trim() || undefined,
          folderId: folder?.folderId,
          content: values.content || undefined,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Note created";
        await showHUD(`Created ${result.relPath ?? relPath}`);
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Create failed";
        toast.message = errorMessage(error);
      }
    },
  });

  return (
    <Form
      isLoading={loadingVaults || loadingFolders}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Note" icon={Icon.Document} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="vault" title="Vault" value={vaultId} onChange={setVaultId}>
        {(vaults ?? []).map((vault) => (
          <Form.Dropdown.Item key={vault.vaultId} title={vault.name} value={vault.vaultId} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="folder" title="Folder" value={folderId} onChange={setFolderId}>
        <Form.Dropdown.Item title="Vault root" value={ROOT_FOLDER} />
        {(folders ?? []).map((folder) => (
          <Form.Dropdown.Item key={folder.folderId} title={folder.path} value={folder.folderId} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="File name" placeholder="e.g. project-plan.md" {...itemProps.fileName} autoFocus />
      <Form.TextField title="Display title" placeholder="Optional note title" {...itemProps.title} />
      <Form.TextArea title="Markdown content" placeholder="Write the initial note content…" {...itemProps.content} />
      <Form.Description text="The file name is normalized to end in .md. Every selected folder must already exist." />
    </Form>
  );
}

export default function CreateNote() {
  return <CreateNoteForm />;
}
