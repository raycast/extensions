import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { ApiFieldTemplates } from "../api/fieldTemplates";
import { UseCachedPromiseOptions } from "../types/utils";

type Props = {
  options?: UseCachedPromiseOptions<typeof ApiFieldTemplates.get>;
};

export default function useFieldTemplates({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(ApiFieldTemplates.get, [], {
    ...options,
  });

  const { statuses, prioritiesObj, priorities, startDate, dueDate } = useMemo(() => {
    const statuses = data?.list
      ?.find((fieldTemplate) => fieldTemplate?.standardType?.toLowerCase() === "status")
      ?.metadata?.options?.filter((option) => !option?.deleted && !option?.archived);

    const prioritiesObj = data?.list?.find(
      (fieldTemplate) => fieldTemplate?.standardType?.toLowerCase() === "priority"
    );

    const priorities = prioritiesObj?.metadata?.options?.filter((option) => !option?.deleted && !option?.archived);

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
