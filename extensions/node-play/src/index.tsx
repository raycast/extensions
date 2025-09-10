import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import { ProjectScript } from './types';
import { scanForProjects, flattenProjectsToScripts } from './projectScanner';
import { getConfig } from './config';

export default function Command() {
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadScripts();
  }, []);

  const loadScripts = async () => {
    try {
      setIsLoading(true);
      const config = await getConfig();

      if (config.rootDirectories.length === 0) {
        setScripts([]);
        return;
      }

      const projects = await scanForProjects(config.rootDirectories);
      const allScripts = flattenProjectsToScripts(projects);
      setScripts(allScripts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Erro ao carregar projetos',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredScripts = scripts.filter(
    (script) =>
      script.projectName.toLowerCase().includes(searchText.toLowerCase()) ||
      script.scriptName.toLowerCase().includes(searchText.toLowerCase())
  );

  const executeScript = async (script: ProjectScript) => {
    try {
      const { exec } = await import('child_process');

      exec(
        `cd "${script.projectPath}" && npm run ${script.scriptName}`,
        (error) => {
          if (error) {
            showToast({
              style: Toast.Style.Failure,
              title: 'Erro ao executar script',
              message: error.message,
            });
            return;
          }

          showToast({
            style: Toast.Style.Success,
            title: 'Script executado com sucesso',
            message: `${script.scriptName} em ${script.projectName}`,
          });
        }
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Erro ao executar script',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  if (isLoading) {
    return (
      <List isLoading={true} searchBarPlaceholder="Carregando projetos..." />
    );
  }

  if (scripts.length === 0) {
    return (
      <List searchBarPlaceholder="Nenhum projeto encontrado">
        <List.EmptyView
          icon={Icon.Folder}
          title="Nenhum projeto Node.js encontrado"
          description="Configure as pastas raiz dos seus projetos nas preferências"
          actions={
            <ActionPanel>
              <Action
                title="Abrir Configurações"
                icon={Icon.Gear}
                onAction={async () => {
                  const { exec } = await import('child_process');
                  exec('raycast://extensions/maxwesley/node-play/configure');
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Buscar projetos e scripts..."
      throttle
    >
      {filteredScripts.map((script, index) => (
        <List.Item
          key={`${script.projectPath}-${script.scriptName}-${index}`}
          title={script.scriptName}
          subtitle={script.projectName}
          accessories={[{ text: script.projectPath }]}
          actions={
            <ActionPanel>
              <Action
                title="Executar Script"
                icon={Icon.Play}
                onAction={() => executeScript(script)}
              />
              <Action
                title="Abrir no Terminal"
                icon={Icon.Terminal}
                onAction={async () => {
                  const { exec } = await import('child_process');
                  exec(`open -a Terminal "${script.projectPath}"`);
                }}
              />
              <Action
                title="Abrir no Finder"
                icon={Icon.Finder}
                onAction={async () => {
                  const { exec } = await import('child_process');
                  exec(`open "${script.projectPath}"`);
                }}
              />
              <Action
                title="Recarregar Projetos"
                icon={Icon.ArrowClockwise}
                onAction={loadScripts}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
