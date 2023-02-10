import { getPreferenceValues } from "@raycast/api";
import { FastEval } from "./fast-eval";
import { SlowEval } from "./slow-eval";

const fastEvaluationEnabled = getPreferenceValues()?.fastEvaluation ?? false;

export default () => (fastEvaluationEnabled ? <FastEval /> : <SlowEval />);
