import Klu from "@kluai/core";
import { getPreferenceValues } from "@raycast/api";

const klu = new Klu(getPreferenceValues().apiKey);

export default klu;
