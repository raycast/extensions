export interface CommandCategory {
  title: string;
  items: Record<string, Command>;
}

export interface Command {
  name: string;
  description: string;
  component: () => JSX.Element;
}
