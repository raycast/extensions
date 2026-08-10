export type Command = {
  kbd: string;
  text: string;
};

export type CommandGroup = {
  key: string;
  commands: Command[];
};
