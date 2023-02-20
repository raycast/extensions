export type AzurePortal = {
  [key: string]: AzureService[];
};

export type AzureService = {
  name: string;
  href: string;
  icon: string;
};
