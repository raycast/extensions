interface SpringValues {
  stiffness: string;
  damping: string;
  mass: string;
}

interface Easing {
  id: string;
  title: string;
  type: string;
  value: string | SpringValues;
  valueType: string;
}

type State = {
  isLoading: boolean;
  easings: Easing[];
};

export type { Easing, State, SpringValues };
