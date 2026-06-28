export declare type FormValues = {
  shiftCode: string;
  projectPath: string;
};

interface Preferences {
  dockerToken: string;
  gitAuthorEmail: string;
  gitAuthorName: string;
  mountOption: string;
  closeAfterCopy: boolean;
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
