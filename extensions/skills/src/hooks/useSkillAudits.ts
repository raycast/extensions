import { useCachedPromise } from "@raycast/utils";

import { type Skill, type SkillAudit } from "../shared";
import {
  type SkillAuditErrorDetails,
  type SkillAuditsResult,
  SkillAuditsAvailabilityState,
  fetchSkillAudits,
} from "../utils/skill-audits";

type UseSkillAuditsOptions = {
  shouldFetch?: boolean;
  initialData?: SkillAuditsResult;
};

type UseSkillAuditsResult = {
  results: SkillAudit[];
  availabilityState?: SkillAuditsAvailabilityState;
  error?: Error;
  errorDetails?: SkillAuditErrorDetails;
  isLoading: boolean;
  result?: SkillAuditsResult;
  revalidate: () => void;
};

export function useSkillAudits(skill: Skill, options?: UseSkillAuditsOptions): UseSkillAuditsResult {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    (inputSkill: Skill) => fetchSkillAudits(inputSkill),
    [skill],
    {
      execute: options?.shouldFetch ?? true,
      initialData: options?.initialData,
    },
  );

  return {
    results: data?.audits ?? [],
    availabilityState: data?.availabilityState,
    error,
    errorDetails: data?.errorDetails,
    isLoading,
    result: data ?? undefined,
    revalidate,
  };
}
