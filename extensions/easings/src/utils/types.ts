interface Easing {
  id: string;
  title: string;
  type: string;
  value: string;
}

type State = {
  isLoading: boolean;
  easings: Easing[];
};

export type { Easing, State };
