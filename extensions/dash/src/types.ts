export interface DashResult {
  title: string;
  subtitle: string[];
  icon: string;
  quicklookurl: string;
  "@_uid": string;
}

export interface Docset {
  docsetBundle: string;
  docsetName: string;
  docsetPath: string;
  docsetKeyword: string;
  keyword: string;
  pluginKeyword: string;
  suggestedKeyword: string;
  iconPath?: string;
}

export interface DashArgumentes {
  searchstring: string;
}
