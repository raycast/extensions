import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { addFolder, errorMessage, Folder, renameFolder } from "../lib/store";

type Props = {
  /** Quando presente, renomeia essa pasta. */
  folder?: Folder;
  onSaved: (folder: Folder) => void | Promise<void>;
};

export function FolderForm({ folder, onSaved }: Props) {
  const [nameError, setNameError] = useState<string>();

  async function submit(values: { name: string }) {
    if (!values.name.trim()) {
      setNameError("Dê um nome à pasta");
      return;
    }
    try {
      let saved: Folder;
      if (folder) {
        await renameFolder(folder.id, values.name);
        saved = { ...folder, name: values.name.trim() };
      } else {
        saved = await addFolder(values.name);
      }
      await showToast({
        style: Toast.Style.Success,
        title: folder ? "Pasta renomeada" : "Pasta pronta",
        message: saved.name,
      });
      await onSaved(saved);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Não salvou", message: errorMessage(e) });
    }
  }

  return (
    <Form
      navigationTitle={folder ? `Renomear ${folder.name}` : "Nova Pasta"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={folder ? "Renomear Pasta" : "Criar Pasta"} icon={Icon.Folder} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Nome da Pasta"
        placeholder="ex.: Clientes, Pessoal, CI/CD…"
        defaultValue={folder?.name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
    </Form>
  );
}
