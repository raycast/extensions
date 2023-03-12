export declare type FormValues = {
  shiftCode: string;
  dockerToken: string;
  mountOption: string;
  projectPath: string;
  gitAuthorName: string;
  gitAuthorEmail: string;
  shiftCommand: string;
};

interface Preferences {
  dockerToken: string;
  mountOption: string;
  gitAuthorEmail: string;
  gitAuthorName: string;
}

export declare type Group = {
  name: string;
  shifts: Shift[];
};

export declare type Shift = {
  code: string;
  name: string;
  description: string;
};

export type Value = string | number | boolean | null;

export type Options = {
  [key: string]: Value;
};

export type Command = string;
