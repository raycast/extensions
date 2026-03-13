import { Image } from "@raycast/api";
// type RequireAtLeastOne<T, R extends keyof T = keyof T> = Omit<T, R> &
//   { [P in R]: Required<Pick<T, P>> & Partial<Omit<T, P>> }[R];
type RequireOnlyOne<T, R extends keyof T = keyof T> = Omit<T, R> &
  { [P in R]: Partial<Pick<T, P>> & Partial<Record<Exclude<R, P>, undefined>> }[R];
interface QueryLookUpBase {
  title: string;
  subtitle?: string;
  key: string;
  icon?: Image.ImageLike;
  strict?: boolean;
}
interface QueryOptionProps extends QueryLookUpBase {
  options?: QueryOptions;
  optionsFunc?: string;
  default?: string;
}

export type QueryOption = RequireOnlyOne<QueryOptionProps, "options" | "optionsFunc">;
export interface QueryOptionResult extends QueryLookUpBase {
  query: string;
  isFinal: boolean;
}
export type QueryOptions = Record<string, QueryOption>;
