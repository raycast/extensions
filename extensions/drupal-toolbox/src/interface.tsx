interface DrupalWebsite {
  id: string;
  title: string;
  version: string;
  root: string;
  tool: DevelopmentTool;
  weight: number;
}

enum DevelopmentTool {
  None = "0",
  DDEV = "1",
  Docksal = "2",
  Lando = "3",
}

enum Filter {
  All = "all",
  Drupal8 = "d8",
  Drupal9 = "d9",
  Drupal10 = "d10",
}

interface Tool {
  title: string;
  icon?: string;
  action: () => void;
}

export { Filter, DevelopmentTool };
export type { DrupalWebsite, Tool };
