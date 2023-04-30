
export interface Client {
  id: string;
  name: string;
  contract: {
    status: string;
  };
}

export interface Environment {
  id: string;
  name: string;
  variablesJSON: string;
}

export interface Test {
  id: string;
  name: string;
  external_id: string;
  code: string;
  tests: {
    id: string;
    test: {
      id: string;
      name: string;
    }
  }[];
}

export interface Workflow {
  id: string;
  name: string;
  steps: {
    id: string;
    step: {
      id: string;
      name: string;
      code: string;
    }
  }[];
}
