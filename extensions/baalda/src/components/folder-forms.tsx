import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  ROOT_FOLDER,
  createFolder,
  listFolders,
  listVaults,
  moveFolder,
  prefs,
  type Folder,
  type Vault,
} from "../lib/baalda";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function chooseDefaultVault(vaults: Vault[], preferred?: string): string {
  const wanted = (preferred ?? prefs().defaultVaultId)?.trim().toLowerCase();
  return (
    (wanted &&
      vaults.find((vault) => vault.vaultId.toLowerCase() === wanted || vault.name.toLowerCase() === wanted)?.vaultId) ??
    vaults[0]?.vaultId ??
    ""
  );
}

export function CreateFolderForm({ defaultVaultId, onDone }: { defaultVaultId?: string; onDone?: () => void }) {
  const { pop } = useNavigation();
  const { data: vaults, isLoading: loadingVaults } = useCachedPromise(listVaults, [], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load vaults",
        message: errorMessage(error),
      }),
  });
  const [vaultId, setVaultId] = useState(defaultVaultId ?? "");
  const [parentId, setParentId] = useState(ROOT_FOLDER);

  useEffect(() => {
    if (!vaultId && vaults?.length) setVaultId(chooseDefaultVault(vaults, defaultVaultId));
  }, [defaultVaultId, vaultId, vaults]);

  useEffect(() => {
    setParentId(ROOT_FOLDER);
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
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    validation: { name: FormValidation.Required },
    async onSubmit(values) {
      const name = values.name.trim();
      const parent = folders?.find((folder) => folder.folderId === parentId);
      const path = parent ? `${parent.path}/${name}` : name;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating folder…" });
      try {
        await createFolder({
          vaultId,
          name,
          path,
          parentId: parent?.folderId,
        });
        toast.style = Toast.Style.Success;
        toast.title = `Created "${path}"`;
        onDone?.();
        if (onDone) pop();
        else popToRoot();
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
          <Action.SubmitForm title="Create Folder" icon={Icon.Folder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Vault" value={vaultId} onChange={setVaultId}>
        {(vaults ?? []).map((vault) => (
          <Form.Dropdown.Item key={vault.vaultId} title={vault.name} value={vault.vaultId} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Parent folder" value={parentId} onChange={setParentId}>
        <Form.Dropdown.Item title="Vault root" value={ROOT_FOLDER} />
        {(folders ?? []).map((folder) => (
          <Form.Dropdown.Item key={folder.folderId} title={folder.path} value={folder.folderId} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Folder name" placeholder="e.g. Projects" {...itemProps.name} autoFocus />
      <Form.Description text="The folder path is built from the selected parent and name." />
    </Form>
  );
}

export function MoveFolderForm({ vaultId, folder, onDone }: { vaultId: string; folder: Folder; onDone?: () => void }) {
  const { pop } = useNavigation();
  const { data: folders, isLoading } = useCachedPromise(listFolders, [vaultId], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load folders",
        message: errorMessage(error),
      }),
  });
  const [parentId, setParentId] = useState(folder.parentId ?? ROOT_FOLDER);
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: folder.name },
    validation: { name: FormValidation.Required },
    async onSubmit(values) {
      const name = values.name.trim();
      const parent = folders?.find((candidate) => candidate.folderId === parentId);
      const path = parent ? `${parent.path}/${name}` : name;
      const toast = await showToast({ style: Toast.Style.Animated, title: "Moving folder…" });
      try {
        await moveFolder({
          folderId: folder.folderId,
          name,
          path,
          parentId: parent ? parent.folderId : null,
        });
        toast.style = Toast.Style.Success;
        toast.title = `Moved "${path}"`;
        onDone?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Move failed";
        toast.message = errorMessage(error);
      }
    },
  });

  const blocked = new Set(
    (folders ?? [])
      .filter((candidate) => candidate.folderId === folder.folderId || candidate.path.startsWith(`${folder.path}/`))
      .map((candidate) => candidate.folderId),
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Move "${folder.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move or Rename Folder" icon={Icon.ArrowRight} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Folder name" {...itemProps.name} autoFocus />
      <Form.Dropdown title="Parent folder" value={parentId} onChange={setParentId}>
        <Form.Dropdown.Item title="Vault root" value={ROOT_FOLDER} />
        {(folders ?? [])
          .filter((candidate) => !blocked.has(candidate.folderId))
          .map((candidate) => (
            <Form.Dropdown.Item key={candidate.folderId} title={candidate.path} value={candidate.folderId} />
          ))}
      </Form.Dropdown>
      <Form.Description text="All notes and subfolders keep their IDs and move with the folder." />
    </Form>
  );
}
