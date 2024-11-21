export type Operator = {
  name: string;
  description: string;
  sweet?: boolean;
  category?: string;
};

export type OperatorData = {
  operators: {
    [key: string]: {
      description: string;
      operators: Operator[];
    };
  };
};
