// JSON structure for entries in ~/Library/Application Support/JetBrains/Toolbox/.settings.json
export default interface JetBrainsToolboxSettings {
  ordering: {
    installed: path[];
  };
  projects?: Record<path, ToolboxProjectConfig>;
  shell_scripts: ShellScripts;
}

interface ShellScripts {
  location: string;
}

export interface ToolboxProjectConfig {
  launchMethod?: string;
  hidden?: string;
  favorite?: boolean;
}

export type path = string;
