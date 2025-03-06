export type CommandGroups<T> = {
  [key: string]: {
    title: string;
    items: { name: T; title: string; icon: string; description: string }[];
  };
};
