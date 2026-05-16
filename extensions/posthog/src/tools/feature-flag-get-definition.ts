import { getFeatureFlag, getFeatureFlagByKey } from "../api/flags";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The flag's `key` (the lowercase identifier used in code). Get this from `feature-flag-get-all`. */
  flagKey?: string;
  /** Alternatively, the numeric flag ID. */
  flagId?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  let id = input.flagId;
  if (!id) {
    if (!input.flagKey) throw new Error("Provide flagKey or flagId.");
    const search = await getFeatureFlagByKey(projectId, input.flagKey);
    const match = search.results.find((f) => f.key === input.flagKey);
    if (!match) throw new Error(`No flag with key "${input.flagKey}".`);
    id = match.id;
  }
  const flag = await getFeatureFlag(projectId, id);
  return { ...flag, url: projectUrl(`feature_flags/${flag.id}`) };
}
