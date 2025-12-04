import { getPreferenceValues } from "@raycast/api";

import { FastEval } from "./fast-eval";
import { SlowEval } from "./slow-eval";

const fastEvaluation = getPreferenceValues()?.fastEvaluation ?? false;

export default () => (fastEvaluation ? <FastEval /> : <SlowEval />);
