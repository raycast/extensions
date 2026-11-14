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
import { maskToken, tokenKind } from "../lib/github";
import {
  deleteToken,
  errorMessage,
  Folder,
  loadVault,
  moveToken,
  NO_FOLDER,
  sortFolders,
  sortTokens,
  TokenEntry,
  Vault,
} from "../lib/store";
import { FolderForm } from "./FolderForm";
import { FolderList } from "./FolderList";
import { TokenForm } from "./TokenForm";
import { VerifyDetail } from "./VerifyDetail";

const ALL = "all";

type Group = { id: string; title: string; tokens: TokenEntry[] };

type Props = {
  /** "all", NO_FOLDER ou o id de uma pasta. */
  initialFilter?: string;
};

export function TokensView({ initialFilter = ALL }: Props) {
  const { pop } = useNavigation();
  const [vault, setVault] = useState<Vault>();
  const [failure, setFailure] = useState<string>();
  const [filter, setFilter] = useState(initialFilter);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

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

  const folders: Folder[] = vault ? sortFolders(vault.folders) : [];
  const folderIds = new Set(folders.map((f) => f.id));
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? "Sem pasta";

  // pasta filtrada que foi excluída em outra tela volta para "todas"
  const activeFilter = filter === ALL || filter === NO_FOLDER || folderIds.has(filter) ? filter : ALL;

  const groups: Group[] = [];
  if (vault) {
    for (const f of folders) {
      groups.push({ id: f.id, title: f.name, tokens: sortTokens(vault.tokens.filter((t) => t.folderId === f.id)) });
    }
    groups.push({
      id: NO_FOLDER,
      title: "Sem pasta",
      tokens: sortTokens(vault.tokens.filter((t) => !t.folderId || !folderIds.has(t.folderId))),
    });
  }
  const visible = activeFilter === ALL ? groups : groups.filter((g) => g.id === activeFilter);
  const newTokenFolder = activeFilter === ALL || activeFilter === NO_FOLDER ? null : activeFilter;

  function toggleReveal(id: string) {
    setRevealed((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function move(t: TokenEntry, folderId: string | null) {
    try {
      await moveToken(t.id, folderId);
      await reload();
      await showToast({
        style: Toast.Style.Success,
        title: "Token movido",
        message: `${t.name} → ${folderName(folderId)}`,
      });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Não moveu", message: errorMessage(e) });
    }
  }

  async function remove(t: TokenEntry) {
    const ok = await confirmAlert({
      title: `Excluir "${t.name}"?`,
      message: "O token sai do cofre do Raycast. No GitHub ele continua válido até você revogá-lo lá.",
      icon: Icon.Trash,
      primaryAction: { title: "Excluir", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    try {
      await deleteToken(t.id);
      await reload();
      await showToast({ style: Toast.Style.Success, title: "Token excluído", message: t.name });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Não excluiu", message: errorMessage(e) });
    }
  }

  const createActions = (
    <ActionPanel.Section title="Criar">
      <Action.Push
        title="Novo Token"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<TokenForm defaultFolderId={newTokenFolder} onSaved={() => pop()} />}
        onPop={reload}
      />
      <Action.Push
        title="Nova Pasta"
        icon={Icon.NewFolder}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "n" }}
        target={<FolderForm onSaved={() => pop()} />}
        onPop={reload}
      />
      <Action.Push
        title="Gerenciar Pastas"
        icon={Icon.List}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
        target={<FolderList />}
        onPop={reload}
      />
      <Action.OpenInBrowser title="Abrir Tokens no GitHub" url="https://github.com/settings/tokens" />
    </ActionPanel.Section>
  );

  function tokenActions(t: TokenEntry) {
    const isRevealed = revealed.has(t.id);
    return (
      <ActionPanel title={t.name}>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copiar Token" content={t.token} concealed />
          <Action.Paste title="Colar Token no App da Frente" content={t.token} />
          <Action
            title={isRevealed ? "Ocultar Token" : "Mostrar Token"}
            icon={isRevealed ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "h" }}
            onAction={() => toggleReveal(t.id)}
          />
          <Action.Push
            title="Verificar no GitHub"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "g" }}
            target={<VerifyDetail entry={t} />}
          />
          <Action.CopyToClipboard title="Copiar Nome" content={t.name} shortcut={Keyboard.Shortcut.Common.CopyName} />
        </ActionPanel.Section>
        <ActionPanel.Section title="Organizar">
          <Action.Push
            title="Editar Token"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<TokenForm entry={t} onSaved={() => pop()} />}
            onPop={reload}
          />
          <ActionPanel.Submenu
            title="Mover para Pasta"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "m" }}
          >
            {folders.map((f) => (
              <Action
                key={f.id}
                title={f.name}
                icon={t.folderId === f.id ? Icon.CheckCircle : Icon.Folder}
                onAction={() => move(t, f.id)}
              />
            ))}
            <Action
              title="Sem pasta"
              icon={!t.folderId || !folderIds.has(t.folderId) ? Icon.CheckCircle : Icon.Tray}
              onAction={() => move(t, null)}
            />
            <Action.Push
              title="Nova Pasta…"
              icon={Icon.NewFolder}
              target={
                <FolderForm
                  onSaved={async (f) => {
                    await moveToken(t.id, f.id);
                    pop();
                  }}
                />
              }
              onPop={reload}
            />
          </ActionPanel.Submenu>
        </ActionPanel.Section>
        {createActions}
        <ActionPanel.Section>
          <Action
            title="Excluir Token"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => remove(t)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const total = vault?.tokens.length ?? 0;
  const visibleCount = visible.reduce((n, g) => n + g.tokens.length, 0);

  return (
    <List
      isLoading={!vault && !failure}
      searchBarPlaceholder="Buscar por nome, pasta, tipo ou observação"
      navigationTitle={
        activeFilter === ALL
          ? "Tokens do GitHub"
          : `Tokens · ${folderName(activeFilter === NO_FOLDER ? null : activeFilter)}`
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Filtrar por pasta" value={activeFilter} onChange={setFilter}>
          <List.Dropdown.Item title="Todas as pastas" value={ALL} icon={Icon.Tray} />
          {folders.length > 0 && (
            <List.Dropdown.Section title="Pastas">
              {folders.map((f) => (
                <List.Dropdown.Item key={f.id} title={f.name} value={f.id} icon={Icon.Folder} />
              ))}
            </List.Dropdown.Section>
          )}
          <List.Dropdown.Item title="Sem pasta" value={NO_FOLDER} icon={Icon.Document} />
        </List.Dropdown>
      }
    >
      {failure ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Cofre ilegível"
          description={failure}
        />
      ) : vault && visibleCount === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title={total === 0 ? "Nenhum token salvo" : "Pasta vazia"}
          description={total === 0 ? "Ctrl+N cria o primeiro token." : "Ctrl+N cria um token já nesta pasta."}
          actions={<ActionPanel>{createActions}</ActionPanel>}
        />
      ) : (
        visible
          .filter((g) => g.tokens.length > 0)
          .map((g) => (
            <List.Section
              key={g.id}
              title={g.title}
              subtitle={`${g.tokens.length} token${g.tokens.length === 1 ? "" : "s"}`}
            >
              {g.tokens.map((t) => {
                const kind = tokenKind(t.token);
                return (
                  <List.Item
                    key={t.id}
                    icon={{ source: Icon.Key, tintColor: Color.Purple }}
                    title={t.name}
                    subtitle={revealed.has(t.id) ? t.token : maskToken(t.token)}
                    keywords={[g.title, kind, ...(t.note ? t.note.split(/\s+/) : [])]}
                    accessories={[
                      ...(t.note ? [{ icon: Icon.Text, tooltip: t.note }] : []),
                      { tag: kind },
                      { date: new Date(t.updatedAt), tooltip: "Atualizado em" },
                    ]}
                    actions={tokenActions(t)}
                  />
                );
              })}
            </List.Section>
          ))
      )}
    </List>
  );
}
