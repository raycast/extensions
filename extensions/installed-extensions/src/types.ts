export type ExtensionMetadata = {
  path: string;
  name: string;
  icon: string;
  title: string;
  author: string;
  owner?: string; // only exists for organizations
  access?: string; // only exists for organizations
  commandCount: number;
  created: Date;
  isLocalExtension: boolean;
  handle: string;
  link: string;
};

export type Option = { id: string; name: string };
