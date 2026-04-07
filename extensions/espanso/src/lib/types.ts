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
  replace?: string;
  image_path?: string;
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

export type EspansoVarParams = {
  format?: string;
  cmd?: string;
  values?: string[];
  echo?: string;
  args?: string[];
  [key: string]: unknown;
};

export type EspansoVar = {
  name: string;
  type: string;
  params?: EspansoVarParams;
};

type BaseMatch = Replacement & (SingleTrigger | MultiTrigger | RegexTrigger);

export type EspansoMatch = BaseMatch & Label & Form & { vars?: EspansoVar[] };

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
  profile?: string;
};

export type CategoryDropdownProps = {
  readonly categories: string[];
  readonly onCategoryChange: (newValue: string) => void;
  readonly separator: string;
};

export type ProfileDropdownProps = {
  readonly profiles: string[];
  readonly onProfileChange: (newValue: string) => void;
  readonly separator: string;
};
