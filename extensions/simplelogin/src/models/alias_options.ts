export type Options = {
  can_create: boolean;
  prefix_suggestion: string;
  suffixes: Suffix[];
};

export type Suffix = {
  is_custom: boolean;
  is_premium: boolean;
  signed_suffix: string;
  suffix: string;
};

export type ParamNewAlias = {
  alias_prefix: string;
  signed_suffix: string;
  mailbox_id: number;
  note: string;
  alias_name: string;
};
