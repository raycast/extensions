import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getFieldTemplates } from "@/api/fieldTemplates";
import { CachedPromiseOptionsType } from "@/types/utils";

type Props = {
  options?: CachedPromiseOptionsType<Awaited<ReturnType<typeof getFieldTemplates>>>;
};

export default function useFieldTemplates({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(getFieldTemplates, [], {
    ...options,
  });

  const { statuses, prioritiesObj, priorities, startDate, dueDate } = useMemo(() => {
    const statuses = data?.list
      ?.find((fieldTemplate) => fieldTemplate?.standardType?.toLowerCase() === "status")
      ?.labels?.filter((label) => !label?.deleted && !label?.archived);

    const prioritiesObj = data?.list?.find(
      (fieldTemplate) => fieldTemplate?.standardType?.toLowerCase() === "priority",
    );

    const priorities = prioritiesObj?.labels?.filter((label) => !label?.deleted && !label?.archived);

    const startDate = data?.list?.find((fieldTemplate) => fieldTemplate?.standardType === "startDate");

    const dueDate = data?.list?.find((fieldTemplate) => fieldTemplate?.standardType === "dueDate");

    return { statuses, prioritiesObj, priorities, startDate, dueDate };
  }, [data]);

  return {
    fieldTemplatesData: data,
    fieldTemplatesStatuses: statuses,
    fieldTemplatesPrioritiesObj: prioritiesObj,
    fieldTemplatesPriorities: priorities,
    fieldTemplatesStartDate: startDate,
    fieldTemplatesDueDate: dueDate,
    fieldTemplatesError: error,
    fieldTemplatesIsLoading: isLoading,
    fieldTemplatesMutate: mutate,
  };
}
