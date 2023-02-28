import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiUrls } from "../api/helpers";
import { getOAuthToken } from "../components/withHeightAuth";
import { FieldTemplateObject } from "../types/fieldTemplate";
import { ApiResponse } from "../types/utils";

type Props = {
  options?: Parameters<typeof useFetch<ApiResponse<FieldTemplateObject[]>>>[1];
};

export default function useFieldTemplates({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<FieldTemplateObject[]>>(ApiUrls.fieldTemplates, {
    headers: {
      Authorization: `api-key ${getOAuthToken()}`,
      "Content-Type": "application/json",
    },
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
