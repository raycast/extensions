import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { FieldTemplateObject } from "../types/fieldTemplate";
import { ApiResponse } from "../types/utils";

type Props = {
  options?: Parameters<typeof useFetch<ApiResponse<FieldTemplateObject[]>>>[1];
};

export default function useFieldTemplates({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<FieldTemplateObject[]>>(ApiUrls.fieldTemplates, {
    headers: ApiHeaders,
    ...options,
  });

  const { statuses, priorities, startDate, dueDate } = useMemo(() => {
    const statuses = data?.list
      ?.find((fieldTemplate) => fieldTemplate.standardType.toLowerCase() === "status")
      ?.metadata?.options?.filter((option) => !option.deleted && !option.archived);

    const priorities = data?.list
      ?.find((fieldTemplate) => fieldTemplate.standardType.toLowerCase() === "priority")
      ?.metadata?.options?.filter((option) => !option.deleted && !option.archived);

    const startDate = data?.list?.find((fieldTemplate) => fieldTemplate.standardType === "startDate");

    const dueDate = data?.list?.find((fieldTemplate) => fieldTemplate.standardType === "dueDate");

    return { statuses, priorities, startDate, dueDate };
  }, [data]);

  return {
    fieldTemplatesData: data,
    fieldTemplatesStatuses: statuses,
    fieldTemplatesPriorities: priorities,
    fieldTemplatesStartDate: startDate,
    fieldTemplatesDueDate: dueDate,
    fieldTemplatesError: error,
    fieldTemplatesIsLoading: isLoading,
    fieldTemplatesMutate: mutate,
  };
}
