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

type BaseMatch = Replacement & (SingleTrigger | MultiTrigger | RegexTrigger);

export type EspansoMatch = {
  label?: string;
} & BaseMatch;

export type FormattedEspansoMatch = EspansoMatch & MultiTrigger;
