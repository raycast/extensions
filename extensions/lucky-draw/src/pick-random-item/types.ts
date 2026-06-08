export type PickRandomItemOptions = {
  items: readonly string[];
};

export type PickRandomItemResultProps = {
  onReset: () => void;
  value: string;
};
