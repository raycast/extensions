import { ActionType } from "./actionType";
import { ContentFormat } from "./contentFormat";
import { TypeMode } from "./typeMode";

export type Preferences = {
  typeMode: TypeMode;
  primaryAction: ActionType;
  contentFormat: ContentFormat;
};
