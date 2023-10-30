export type DataType = {
  [key: string]: any;
  path: string;
  name: string;
  icon: string;
  title: string;
  author: string;
  owner: string;
  commands: string;
  isLocalExtension: boolean;
  isOrganization: boolean;
  link: string;
};

export type OptionType = { id: string; name: string };
