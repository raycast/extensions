import { ContentFormat } from "./contentFormat";
import { OnSelection } from "./onSelection";
import { TypeMode } from "./typeMode";

export type Preferences = {
  typeMode: TypeMode;
  onSelection: OnSelection;
  contentFormat: ContentFormat;
};
