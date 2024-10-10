export interface EnvType {
  env: Record<string, string>;
  cwd: string;
  shell: string;
}

export interface ShellArguments {
  command: string;
}
export interface Preferences {
  arguments_terminal: boolean;
  arguments_terminal_type: string;
}

export interface Category {
  category: string;
  items: string[];
}

export interface Props {
  shellArguments?: ShellArguments;
}
