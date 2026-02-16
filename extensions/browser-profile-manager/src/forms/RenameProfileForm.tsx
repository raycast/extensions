import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { setProfileAlias } from "../storage";
import { ResolvedBrowserProfile } from "../types";

interface RenameProfileFormValues {
  alias: string;
}

interface RenameProfileFormProps {
  profile: ResolvedBrowserProfile;
  onSaved: () => Promise<void>;
}

export function RenameProfileForm({
  profile,
  onSaved,
}: RenameProfileFormProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(values: RenameProfileFormValues) {
    const alias = values.alias.trim();
    if (!alias) {
      await showToast({
        style: Toast.Style.Failure,
        title: "O Apelido Nao Pode Estar Vazio",
      });
      return;
    }

    setIsSaving(true);

    try {
      await setProfileAlias(profile.id, alias);
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: "Perfil Renomeado",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nao Foi Possivel Renomear O Perfil",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Salvar Apelido" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Perfil"
        text={`${profile.originalName} (${profile.browser})`}
      />
      <Form.TextField
        id="alias"
        title="Apelido"
        placeholder="Digite um nome personalizado para o perfil"
        defaultValue={profile.alias ?? ""}
      />
    </Form>
  );
}
