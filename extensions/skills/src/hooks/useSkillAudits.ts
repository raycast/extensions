import { useCachedPromise } from "@raycast/utils";

import { type Skill, type SkillAudit } from "../shared";
import { type SkillAuditsAvailability, type SkillAuditsResult, fetchSkillAudits } from "../utils/skill-audits";

type UseSkillAuditsOptions = {
  shouldFetch?: boolean;
  initialData?: SkillAuditsResult;
};

type UseSkillAuditsResult = {
  result?: SkillAuditsResult;
  audits: SkillAudit[];
  isLoading: boolean;
  error?: Error;
  availability?: SkillAuditsAvailability;
};

export function useSkillAudits(skill: Skill, options?: UseSkillAuditsOptions): UseSkillAuditsResult {
  const { data, error, isLoading } = useCachedPromise((inputSkill: Skill) => fetchSkillAudits(inputSkill), [skill], {
    keepPreviousData: true,
    execute: options?.shouldFetch ?? true,
    initialData: options?.initialData,
  });

  return {
    result: data ?? undefined,
    audits: data?.audits ?? [],
    isLoading,
    error: error ?? undefined,
    availability: data?.availability,
  };
}
