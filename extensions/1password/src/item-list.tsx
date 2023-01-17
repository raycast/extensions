import { getPreferenceValues } from "@raycast/api";
import { Items } from "./v8/components/Items";
import { Items as V7Items } from "./v7/components/Items";

export default function Command() {
  return getPreferenceValues().version == "v8" ? <Items /> : <V7Items />;
}
