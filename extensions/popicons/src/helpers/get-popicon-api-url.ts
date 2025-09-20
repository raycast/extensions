import { PopiconVariant } from "../enums/popicon-variant";
import { exhaustive } from "./exhaustive";

export const ENDPOINT = "https://popicons-universal.up.railway.app/v1/web/icons";

export function getPopiconApiUrl(variant: PopiconVariant) {
  const url = new URL(ENDPOINT);

  switch (variant) {
    case PopiconVariant.Line:
      url.searchParams.append("variant", encodeURI("Style=Line"));
      return url.toString();
    case PopiconVariant.Solid:
      url.searchParams.append("variant", encodeURI("Style=Solid"));
      return url.toString();
    case PopiconVariant.Duotone:
      url.searchParams.append("variant", encodeURI("Style=Duotone"));
      return url.toString();
    default:
      return exhaustive(variant);
  }
}
