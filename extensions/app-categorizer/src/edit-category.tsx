import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getApplications,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createOrUpdateCategory,
  renameCategory,
  getCategories,
  getCustomApps,
  AppInfo,
} from "./utils/storage";

interface Props {
  categoryName: string;
  apps: AppInfo[];
  onSaved: () => void;
}

interface FormValues {
  categoryName: string;
  selectedApps: string[];
}

export default function EditCategory({
  categoryName,
  apps: currentApps,
  onSaved,
}: Props) {
  const [allApps, setAllApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  useEffect(() => {
    async function loadApps() {
      try {
        const installedApps = await getApplications();
        const mapped: AppInfo[] = installedApps.map((a) => ({
          name: a.name,
          path: a.path,
          bundleId: a.bundleId,
        }));
        const customApps = await getCustomApps();
        const merged = [...customApps, ...mapped];
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setAllApps(merged);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Erro ao listar aplicativos instalados",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadApps();
  }, []);

  async function handleSubmit(values: FormValues) {
    const trimmed = values.categoryName.trim();
    if (!trimmed) {
      setNameError("Informe um nome válido");
      return;
    }

    if (trimmed !== categoryName) {
      const existing = await getCategories();
      if (existing[trimmed]) {
        setNameError("Já existe uma categoria com esse nome");
        return;
      }
    }

    const selected = allApps.filter((a) =>
      values.selectedApps.includes(a.path),
    );

    if (trimmed !== categoryName) {
      await renameCategory(categoryName, trimmed);
    }
    await createOrUpdateCategory(trimmed, selected);

    showToast({ style: Toast.Style.Success, title: "Categoria atualizada" });
    onSaved();
    pop();
  }

  const defaultSelected = currentApps.map((a) => a.path);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Salvar Alterações"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="categoryName"
        title="Nome da Categoria"
        defaultValue={categoryName}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Separator />
      <Form.TagPicker
        id="selectedApps"
        title="Aplicativos"
        defaultValue={defaultSelected}
      >
        {allApps.map((app) => (
          <Form.TagPicker.Item
            key={app.path}
            value={app.path}
            title={app.name}
            icon={
              app.icon
                ? { source: app.icon }
                : app.path.includes("://")
                  ? Icon.GameController
                  : { fileIcon: app.path }
            }
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
