import { List } from "@raycast/api";
import { lstatSync, readdirSync } from "fs-extra";
import { join } from "path";
import LocalItem from "./components/LocalItem";

import { workspacePath } from "./preference";

function VisualStudioCodeWorkspaceManager() {
  const WORKSPACE_DIR = workspacePath;

  const directoryFilter = (filename: string) => {
    return lstatSync(join(WORKSPACE_DIR, filename)).isDirectory();
  };

  const dirs = readdirSync(join(WORKSPACE_DIR)).filter(directoryFilter);
  const projects = dirs.map((item) => join(WORKSPACE_DIR, item));

  return (
    <List searchBarPlaceholder="Search Project Name...">
      <List.Section title="Result">
        {projects.map((project) => {
          return <LocalItem key={project} project={project} />;
        })}
      </List.Section>
    </List>
  );
}

export default VisualStudioCodeWorkspaceManager;
