import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { getConfig, addRootDirectory, removeRootDirectory } from './config';

export default function ConfigureCommand() {
  const [rootDirectories, setRootDirectories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getConfig();
      setRootDirectories(config.rootDirectories);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Erro ao carregar configuração',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addDirectory = async () => {
    try {
      const { exec } = await import('child_process');

      exec(
        'osascript -e \'tell app "System Events" to return POSIX path of (choose folder with prompt "Selecione uma pasta raiz para projetos Node.js:")\'',
        (error, stdout) => {
          if (error) {
            showToast({
              style: Toast.Style.Failure,
              title: 'Erro ao selecionar pasta',
              message: error.message,
            });
            return;
          }

          const selectedPath = stdout.trim();
          if (selectedPath && !rootDirectories.includes(selectedPath)) {
            addRootDirectory(selectedPath).then(() => {
              setRootDirectories((prev) => [...prev, selectedPath]);
              showToast({
                style: Toast.Style.Success,
                title: 'Pasta adicionada',
                message: selectedPath,
              });
            });
          }
        }
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Erro ao adicionar pasta',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const removeDirectory = async (path: string) => {
    try {
      await removeRootDirectory(path);
      setRootDirectories((prev) => prev.filter((p) => p !== path));
      showToast({
        style: Toast.Style.Success,
        title: 'Pasta removida',
        message: path,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Erro ao remover pasta',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const openInFinder = async (path: string) => {
    const { exec } = await import('child_process');
    exec(`open "${path}"`);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Configurar pastas raiz..."
    >
      <List.Section title="Pastas Raiz Configuradas">
        {rootDirectories.map((path, index) => (
          <List.Item
            key={index}
            title={path.split('/').pop() || path}
            subtitle={path}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Remover Pasta"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeDirectory(path)}
                />
                <Action
                  title="Abrir no Finder"
                  icon={Icon.Finder}
                  onAction={() => openInFinder(path)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Ações">
        <List.Item
          title="Adicionar Nova Pasta"
          subtitle="Selecionar uma pasta raiz para projetos Node.js"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Adicionar Pasta"
                icon={Icon.Plus}
                onAction={addDirectory}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {rootDirectories.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="Nenhuma pasta configurada"
          description="Adicione pastas raiz que contenham projetos Node.js"
          actions={
            <ActionPanel>
              <Action
                title="Adicionar Primeira Pasta"
                icon={Icon.Plus}
                onAction={addDirectory}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
