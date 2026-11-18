export interface GCloudConfig {
  name: string;
  is_active: boolean;
  properties: {
    core?: { project?: string; account?: string };
    compute?: { region?: string };
  };
}
