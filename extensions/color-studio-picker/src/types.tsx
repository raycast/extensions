interface Color {
  title: string;
  color: string;
}

interface Section {
  title: string;
  items: JSX.Element[];
}

interface ColorResult {
  title: string;
  color?: string;
}

type ColorGroups = {
  [key: string]: Color[];
};

interface ListItemProps {
  title: string;
  color: string;
}

interface DropdownProps {
  categories: string[];
  setSection: (value: string) => void;
}

interface LaunchProps {
  arguments: {
    color: string;
  };
}

export type { Color, Section, ColorResult, ColorGroups, ListItemProps, DropdownProps, LaunchProps };
