import { ActionPanel, clearSearchBar, Icon, List, showHUD, Action } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useEffect, useState } from "react";

export default function ProcessList() {
  const [state, setState] = useState<Process[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const execP = promisify(exec);

  const cmd = `osascript -e 'tell application "System Events" to get properties of (processes where background only is false)'`;

  const nameRegex = /, displayed name:(.*?),/g;
  const idRegex = new RegExp(", unix id:(.*?)(,|$)", "g");
  const fileRegex = /, file:(.*?),/g;

  const fetchProcesses = async () => {
    const { stdout, stderr } = await execP(cmd);

    // error case
    if (stderr.length > 0) {
      return;
    }

    // get rid of newline at the end of the text
    const properties = stdout.trim();

    // match wanted information from apple record
    const nameMatches = properties.matchAll(nameRegex);
    const idMatches = properties.matchAll(idRegex);
    const fileMatches = properties.matchAll(fileRegex);

    const names = Array.from(nameMatches, (m) => m[1]);
    const ids = Array.from(idMatches, (m) => m[1]);
    const files = Array.from(fileMatches, (m) => m[1]).map((file) => {
      file = file.replace(/.*?:/, "");
      file = file.replaceAll(":", "/");
      file = file.substring(0, file.length - 1);
      return file;
    });

    // Create the Processes
    const processes = names
      .map((name, index) => {
        return {
          name: name,
          id: ids[index],
          iconPath: files[index],
        } as Process;
      })
      // don't show finder in the menu
      .filter((process) => {
        return process.name !== "Finder";
      });

    setState(processes);
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fileIcon = (process: Process) => {
    return { fileIcon: process.iconPath ?? "" };
  };

  const killProcess = (process: Process) => {
    exec(`kill -9 ${process.id}`);
    setState(state.filter((p) => p.id !== process.id));
    clearSearchBar({ forceScrollToTop: true });
    showHUD(`✅ Killed ${process.name === "-" ? `process ${process.id}` : process.name}`);
  };

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {state
        .filter((process) => {
          if (query == null) {
            return true;
          }

          const nameMatches = process.name.toLowerCase().includes(query.toLowerCase());
          return nameMatches;
        })
        .map((process, index) => {
          return (
            <List.Item
              key={index}
              title={process.name}
              icon={fileIcon(process)}
              actions={
                <ActionPanel>
                  <Action title="Kill" icon={Icon.XmarkCircle} onAction={() => killProcess(process)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

type Process = {
  id: string;
  iconPath: string;
  name: string;
};
