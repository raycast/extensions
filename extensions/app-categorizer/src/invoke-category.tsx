import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { spawn } from "child_process";
import path from "path";
import { getCategories, CategoryMap, AppInfo } from "./utils/storage";

/**
 * Executa um app. Links de launcher (ex: steam://...) são abertos pelo handler
 * padrão do Windows via open(). Executáveis de arquivo são iniciados com o
 * diretório de trabalho apontando para a própria pasta do .exe — isso evita
 * que o app feche sozinho logo após abrir, o que costuma acontecer quando o
 * processo é iniciado sem o cwd correto (comum em jogos que procuram arquivos
 * relativos à própria pasta).
 */
async function launchApp(app: AppInfo): Promise<void> {
  if (app.path.includes("://")) {
    await open(app.path);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(app.path, [], {
      cwd: path.dirname(app.path),
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("error", reject);
    child.unref();
    resolve();
  });
}

export default function InvokeCategory() {
  const [categories, setCategories] = useState<CategoryMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
      setIsLoading(false);
    }
    load();
  }, []);

  const names = Object.keys(categories);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Digite o nome da categoria..."
    >
      {names.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Nenhuma categoria criada"
          description="Use o comando 'Criar Categoria' primeiro"
        />
      ) : (
        names.map((name) => (
          <List.Item
            key={name}
            title={name}
            subtitle={`${categories[name].length} app(s)`}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Abrir Categoria"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    push(
                      <CategoryApps
                        apps={categories[name]}
                        categoryName={name}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CategoryApps({
  apps,
  categoryName,
}: {
  apps: AppInfo[];
  categoryName: string;
}) {
  async function handleOpen(app: AppInfo) {
    try {
      await launchApp(app);
      showToast({ style: Toast.Style.Success, title: `Abrindo ${app.name}` });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Erro ao abrir ${app.name}`,
        message: String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder={`Apps em "${categoryName}"...`}>
      {apps.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Categoria vazia"
          description="Edite a categoria para adicionar apps"
        />
      ) : (
        apps.map((app) => (
          <List.Item
            key={app.path}
            title={app.name}
            icon={
              app.icon
                ? { source: app.icon }
                : app.path.includes("://")
                  ? Icon.GameController
                  : { fileIcon: app.path }
            }
            actions={
              <ActionPanel>
                <Action
                  title="Executar Aplicativo"
                  icon={Icon.Play}
                  onAction={() => handleOpen(app)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
