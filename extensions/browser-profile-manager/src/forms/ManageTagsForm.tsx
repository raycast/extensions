import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { setProfileTags } from "../storage";
import { ResolvedBrowserProfile } from "../types";

interface ManageTagsFormValues {
  tags: string[];
  newTags: string;
}

interface ManageTagsFormProps {
  profile: ResolvedBrowserProfile;
  availableTags: string[];
  onSaved: () => Promise<void>;
}

export function ManageTagsForm({
  profile,
  availableTags,
  onSaved,
}: ManageTagsFormProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  const tagOptions = useMemo(() => {
    const set = new Set<string>([...availableTags, ...profile.tags]);
    return [...set].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    );
  }, [availableTags, profile.tags]);

  async function handleSubmit(values: ManageTagsFormValues) {
    setIsSaving(true);

    try {
      const createdTags = values.newTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const mergedTags = unique([...(values.tags ?? []), ...createdTags]);

      await setProfileTags(profile.id, mergedTags);
      await onSaved();
      await showToast({
        style: Toast.Style.Success,
        title: "Tags Atualizadas",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nao Foi Possivel Atualizar As Tags",
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
          <Action.SubmitForm title="Salvar Tags" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Perfil"
        text={`${profile.originalName} (${profile.browser})`}
      />
      <Form.TagPicker id="tags" title="Tags" defaultValue={profile.tags}>
        {tagOptions.map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="newTags"
        title="Adicionar Novas Tags"
        placeholder="Tags separadas por virgula"
      />
    </Form>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}
