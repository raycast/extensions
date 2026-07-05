import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getApplications,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createOrUpdateCategory,
  getCategories,
  getCustomApps,
  AppInfo,
} from "./utils/storage";

interface FormValues {
  categoryName: string;
  selectedApps: string[];
}

export default function CreateCategory() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameError, setNameError] = useState<string | undefined>();

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
        setApps(merged);
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
      setNameError("Informe um nome para a categoria");
      return;
    }

    const existing = await getCategories();
    if (existing[trimmed]) {
      setNameError("Já existe uma categoria com esse nome");
      return;
    }

    if (!values.selectedApps || values.selectedApps.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Selecione ao menos um aplicativo",
      });
      return;
    }

    const selected = apps.filter((a) => values.selectedApps.includes(a.path));
    await createOrUpdateCategory(trimmed, selected);
    showToast({
      style: Toast.Style.Success,
      title: `Categoria "${trimmed}" criada`,
      message: `${selected.length} app(s) adicionados`,
    });
    popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Criar Categoria" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="categoryName"
        title="Nome da Categoria"
        placeholder="Ex: Trabalho, Design, Jogos"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.Separator />
      <Form.TagPicker
        id="selectedApps"
        title="Aplicativos"
        placeholder="Buscar e selecionar apps..."
      >
        {apps.map((app) => (
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
