import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { FieldTemplateObject } from "../types/fieldTemplate";
import { ApiResponse } from "../types/utils";

export default function useFieldTemplates() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<FieldTemplateObject>>(ApiUrls.fieldTemplates, {
    headers: ApiHeaders,
  });

  const { statuses, priorities } = useMemo(() => {
    const statuses = data?.list
      ?.find((fieldTemplate) => fieldTemplate.standardType === "status")
      ?.metadata?.options?.filter((option) => !option.deleted && !option.archived);

    const priorities = data?.list
      ?.find((fieldTemplate) => fieldTemplate.standardType === "priority")
      ?.metadata?.options?.filter((option) => !option.deleted && !option.archived);

    return { statuses, priorities };
  }, [data]);

  return {
    fieldTemplatesData: data,
    fieldTemplatesStatuses: statuses,
    fieldTemplatesPriorities: priorities,
    fieldTemplatesError: error,
    fieldTemplatesIsLoading: isLoading,
    fieldTemplatesMutate: mutate,
  };
}
