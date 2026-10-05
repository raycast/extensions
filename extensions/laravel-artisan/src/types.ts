type Argument = {
  name: string;
  description: string;
  // Array arguments, like queue:retry's ids, default to a list
  default: string | string[] | null;
  required: boolean;
};
type Option = {
  name: string;
  description: string;
  value_required: boolean;
  value_optional: boolean;
};

export type ConsoleCommand = {
  name: string;
  description: string;
  synopsis: string;
  aliases: string[];
  arguments: Argument[];
  options: Option[];
};
