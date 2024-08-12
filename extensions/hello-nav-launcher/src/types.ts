export interface AppItem {
  name: string;
  homepage: string;
  repository?: string;
  icon: string;
  keywords?: string[];
  darkInvert?: true;
  lessRadius?: true;
  favorite?: boolean;
  hidden?: boolean;
  first?: boolean;
  final?: boolean;
}

export interface CateItem {
  title: string;
  children: AppItem[];
}
