import { components } from "~/api/schema";

export interface StandardError {
  detail: string;
}

export type UnifiedError = components["schemas"]["UnifiedError"];
interface ConnectionError {
  type: "connection";
  status: null;
  detail: string;
  meta: "abort" | "timeout";
}
export type IntegratedError = UnifiedError | ConnectionError;

export type WrappedCardResponse = components["schemas"]["WrappedCardResponse"];
export type WrappedErrorResponse = components["schemas"]["WrappedErrorResponse"];
export type WrappedResponses = Array<WrappedCardResponse | WrappedErrorResponse>;

export type ICard = components["schemas"]["TransformedCardResponse"];
export type ICardCollection = Record<string, ICard>;

export type ISimpleCard = components["schemas"]["PostSimpleCard"];
