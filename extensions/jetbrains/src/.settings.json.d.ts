// JSON structure for entries in ~/Library/Application Support/JetBrains/Toolbox/.settings.json
export default interface Settings {
  shell_scripts: ShellScripts;
}

interface ShellScripts {
  location: string;
}
