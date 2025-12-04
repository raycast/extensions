type Argument = {
  name: string;
  description: string;
  default: string | null;
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
  arguments: Argument[];
  options: Option[];
};
