export interface Header {
  name: string;
  value: string;
}

export interface GraphQLEnvironment {
  id: string;
  name: string;
  /** GraphQL endpoint, e.g. https://api.example.com/graphql */
  url: string;
  /** Headers sent with every request, e.g. `Authorization: Bearer …` */
  headers: Header[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedQuery {
  id: string;
  name: string;
  /** GraphQL document (may contain several operations and fragments) */
  query: string;
  environmentId?: string;
  /** Font Awesome icon id in the form `<prefix>:<icon-name>`, e.g. `fas:house` */
  icon?: string;
  /** Id of one of the colors in `ICON_COLORS` */
  iconColor?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * A value as entered in the variables form. Text fields use `null` for "not set", because `""` is a value they can
 * send; other fields use `NOT_SET` (`""`).
 */
export type RawValue = string | boolean | null;

/** Raw values typed in the variables form, keyed by variable name. */
export type RawVariableValues = Record<string, RawValue>;
