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
    (id: string, skillId: string, source: string) =>
      fetchSkillAudits({ id, skillId, name: skill.name, installs: skill.installs, source }),
    [skill.id, skill.skillId, skill.source],
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
