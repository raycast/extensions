export type Scenario = {
  id: number;
  teamId: number;
  name: string;
  usedPackages: string[];
  islinked: boolean;
};

export type Scenarios = Scenario[];
