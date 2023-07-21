type RoamResponse<T> = {
  result: T;
  messgae: string;
};

type CachedGraph = { nameField: string; tokenField: string };

type CachedGraphMap = Record<string, CachedGraph>;
