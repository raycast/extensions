export type OWL = {
  id: string;
  from: string;
  to: string;
  history: {
    input: string;
    output: string;
    timestamp: Date;
  }[];
};

export type OWLMapping = {
  [key: string]: OWL[];
};
