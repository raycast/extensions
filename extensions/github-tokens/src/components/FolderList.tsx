import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { deleteFolder, errorMessage, Folder, loadVault, NO_FOLDER, sortFolders, Vault } from "../lib/store";
import { FolderForm } from "./FolderForm";
import { TokenForm } from "./TokenForm";
import { TokensView } from "./TokensView";

export function FolderList() {
  const { pop } = useNavigation();
  const [vault, setVault] = useState<Vault>();
  const [failure, setFailure] = useState<string>();

  const reload = useCallback(async () => {
    try {
      setVault(await loadVault());
      setFailure(undefined);
    } catch (e) {
      setFailure(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const folders = vault ? sortFolders(vault.folders) : [];
  const folderIds = new Set(folders.map((f) => f.id));
  const countIn = (id: string) => vault?.tokens.filter((t) => t.folderId === id).length ?? 0;
  const loose = vault?.tokens.filter((t) => !t.folderId || !folderIds.has(t.folderId)).length ?? 0;
  const plural = (n: number) => `${n} token${n === 1 ? "" : "s"}`;

  async function remove(f: Folder) {
    const n = countIn(f.id);
    const ok = await confirmAlert({
      title: `Excluir a pasta "${f.name}"?`,
      message: n > 0 ? `${plural(n)} desta pasta vão para "Sem pasta". Nenhum token é apagado.` : "A pasta está vazia.",
      icon: Icon.Trash,
      primaryAction: { title: "Excluir Pasta", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      const moved = await deleteFolder(f.id);
      await reload();
      await showToast({
        style: Toast.Style.Success,
        title: "Pasta excluída",
        message: moved > 0 ? `${plural(moved)} foram para "Sem pasta"` : f.name,
      });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Não excluiu", message: errorMessage(e) });
    }
  }

  const newFolderAction = (
    <Action.Push
      title="Nova Pasta"
      icon={Icon.NewFolder}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<FolderForm onSaved={() => pop()} />}
      onPop={reload}
    />
  );

  return (
    <List isLoading={!vault && !failure} navigationTitle="Pastas de Tokens" searchBarPlaceholder="Buscar pasta">
      {failure ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Cofre ilegível"
          description={failure}
        />
      ) : vault && folders.length === 0 && loose === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Nenhuma pasta"
          description="Ctrl+N cria a primeira pasta."
          actions={<ActionPanel>{newFolderAction}</ActionPanel>}
        />
      ) : (
        <>
          {folders.map((f) => (
            <List.Item
              key={f.id}
              icon={{ source: Icon.Folder, tintColor: Color.Blue }}
              title={f.name}
              accessories={[{ text: plural(countIn(f.id)) }]}
              actions={
                <ActionPanel title={f.name}>
                  <Action.Push
                    title="Abrir Pasta"
                    icon={Icon.ArrowRight}
                    target={<TokensView initialFilter={f.id} />}
                    onPop={reload}
                  />
                  <Action.Push
                    title="Novo Token Nesta Pasta"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
                    target={<TokenForm defaultFolderId={f.id} onSaved={() => pop()} />}
                    onPop={reload}
                  />
                  <Action.Push
                    title="Renomear Pasta"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<FolderForm folder={f} onSaved={() => pop()} />}
                    onPop={reload}
                  />
                  {newFolderAction}
                  <Action
                    title="Excluir Pasta"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(f)}
                  />
                </ActionPanel>
              }
            />
          ))}
          {loose > 0 && (
            <List.Item
              icon={Icon.Tray}
              title="Sem pasta"
              accessories={[{ text: plural(loose) }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Abrir"
                    icon={Icon.ArrowRight}
                    target={<TokensView initialFilter={NO_FOLDER} />}
                    onPop={reload}
                  />
                  {newFolderAction}
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
