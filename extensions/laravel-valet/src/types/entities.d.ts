export declare type Config = {
  paths: string[];
  tld: string;
  loopBack: string;
  logs?: Log;
};

type Log = {
  [key: string]: string;
};

export declare type Site = {
  name: string;
  path: string;
  prettyPath: string;
  secured: boolean;
  url: string;
};
