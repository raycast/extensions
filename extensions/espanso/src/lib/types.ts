export type SingleTrigger = {
  trigger: string;
};

export type MultiTrigger = {
  triggers: string[];
};

export type RegexTrigger = {
  regex: string;
};

export type Replacement = {
  replace: string;
};

export type Label = {
  label?: string;
};

export type Form = {
  form?: string;
};

export type FilePath = {
  filePath: string;
};

type BaseMatch = Replacement & (SingleTrigger | MultiTrigger | RegexTrigger);

export type EspansoMatch = BaseMatch & Label & Form;

export type NormalizedEspansoMatch = EspansoMatch & MultiTrigger & FilePath & { category?: string };

export type EspansoConfig = {
  config: string;
  packages: string;
  runtime: string;
  match: string;
};

export type FormattedMatch = NormalizedEspansoMatch & {
  category: string;
  subcategory?: string;
  triggers: string[];
};

export type CategoryDropdownProps = {
  readonly categories: string[];
  readonly onCategoryChange: (newValue: string) => void;
};
