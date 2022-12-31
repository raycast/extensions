export type Category = {
  id: string;
  title: string;
  icons: string[];
};

export type ReactIcon = {
  icon: string;
  category: {
    id: string;
    title: string;
  };
};

export type Preferences = {
  action: "Copy" | "Paste";
};

export type PinnedMovement = {
  up: boolean;
  right: boolean;
  down: boolean;
  left: boolean;
};

export type IconProps = {
  icon: string;
  category: Category;
  pinned?: boolean;
  recent?: boolean;
  movement?: PinnedMovement;
  refresh: () => void;
};
