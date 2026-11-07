import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { tokenKind } from "../lib/github";
import {
  addFolder,
  addToken,
  errorMessage,
  Folder,
  loadVault,
  NO_FOLDER,
  sortFolders,
  TokenEntry,
  updateToken,
} from "../lib/store";

const NEW_FOLDER = "__new__";

type Values = {
  name: string;
  token: string;
  newFolder?: string;
  note?: string;
};

type Props = {
  /** Quando presente, o formulário edita esse token em vez de criar um novo. */
  entry?: TokenEntry;
  /** Pasta já escolhida ao abrir (ex.: criar token de dentro de uma pasta). */
  defaultFolderId?: string | null;
  onSaved: (name: string) => void | Promise<void>;
};

export function TokenForm({ entry, defaultFolderId, onSaved }: Props) {
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [folderValue, setFolderValue] = useState<string>((entry ? entry.folderId : defaultFolderId) ?? NO_FOLDER);
  const [nameError, setNameError] = useState<string>();
  const [tokenError, setTokenError] = useState<string>();
  const [newFolderError, setNewFolderError] = useState<string>();
  const [kindHint, setKindHint] = useState<string | null>(entry ? tokenKind(entry.token) : null);

  useEffect(() => {
    loadVault()
      .then((v) => {
        const sorted = sortFolders(v.folders);
        setFolders(sorted);
        // pasta que sumiu entre abrir e carregar volta para "Sem pasta"
        setFolderValue((cur) =>
          cur === NO_FOLDER || cur === NEW_FOLDER || sorted.some((f) => f.id === cur) ? cur : NO_FOLDER,
        );
      })
      .catch((e) => {
        setFolders([]);
        void showToast({ style: Toast.Style.Failure, title: "Erro ao ler o cofre", message: errorMessage(e) });
      });
  }, []);

  async function submit(values: Values) {
    let invalid = false;
    if (!values.name.trim()) {
      setNameError("Dê um nome ao token");
      invalid = true;
    }
    if (!values.token.trim()) {
      setTokenError("Cole o token");
      invalid = true;
    }
    if (folderValue === NEW_FOLDER && !values.newFolder?.trim()) {
      setNewFolderError("Dê um nome à pasta");
      invalid = true;
    }
    if (invalid) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Salvando…" });
    try {
      let folderId: string | null = folderValue === NO_FOLDER ? null : folderValue;
      if (folderValue === NEW_FOLDER) folderId = (await addFolder(values.newFolder ?? "")).id;

      const input = { name: values.name, token: values.token, folderId, note: values.note };
      if (entry) await updateToken(entry.id, input);
      else await addToken(input);

      toast.style = Toast.Style.Success;
      toast.title = entry ? "Token atualizado" : "Token salvo";
      toast.message = values.name.trim();
      await onSaved(values.name.trim());
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Não salvou";
      toast.message = errorMessage(e);
    }
  }

  return (
    <Form
      isLoading={folders === null}
      navigationTitle={entry ? `Editar ${entry.name}` : "Novo Token do GitHub"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={entry ? "Salvar Alterações" : "Salvar Token"} icon={Icon.Lock} onSubmit={submit} />
          <Action.OpenInBrowser
            title="Criar Token no GitHub"
            url="https://github.com/settings/personal-access-tokens/new"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Nome"
        placeholder="ex.: Deploy Carboss, CI Lis Control…"
        defaultValue={entry?.name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.PasswordField
        id="token"
        title="Token"
        placeholder="ghp_… ou github_pat_…"
        defaultValue={entry?.token}
        error={tokenError}
        info={kindHint ? `Tipo detectado: ${kindHint}` : undefined}
        onChange={(v) => {
          if (tokenError) setTokenError(undefined);
          setKindHint(v.trim() ? tokenKind(v.trim()) : null);
        }}
      />
      {folders !== null && (
        <Form.Dropdown id="folder" title="Pasta" value={folderValue} onChange={setFolderValue}>
          <Form.Dropdown.Item value={NO_FOLDER} title="Sem pasta" icon={Icon.Tray} />
          {folders.length > 0 && (
            <Form.Dropdown.Section title="Pastas">
              {folders.map((f) => (
                <Form.Dropdown.Item key={f.id} value={f.id} title={f.name} icon={Icon.Folder} />
              ))}
            </Form.Dropdown.Section>
          )}
          <Form.Dropdown.Item value={NEW_FOLDER} title="Nova pasta…" icon={Icon.NewFolder} />
        </Form.Dropdown>
      )}
      {folderValue === NEW_FOLDER && (
        <Form.TextField
          id="newFolder"
          title="Nome da Nova Pasta"
          placeholder="ex.: Clientes, Pessoal, CI/CD…"
          error={newFolderError}
          onChange={() => newFolderError && setNewFolderError(undefined)}
        />
      )}
      <Form.TextArea
        id="note"
        title="Observação"
        placeholder="Escopos, onde é usado, quando expira… (opcional)"
        defaultValue={entry?.note}
      />
      <Form.Description text="O token fica no armazenamento criptografado do Raycast e é copiado sem entrar no histórico da área de transferência." />
    </Form>
  );
}
