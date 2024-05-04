export interface Configuration {
  description: string;
  title: string;
  repository: string;
  reason: string[];
}

export const removeConfig = (config: Configuration, configList: Configuration[]) => {
  const key = JSON.stringify(config);
  return configList.filter((c) => JSON.stringify(c) !== key);
};
