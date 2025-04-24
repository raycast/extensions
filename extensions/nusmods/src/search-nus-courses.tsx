import { Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useCallback } from "react";
import { CourseSummaryList } from "./components/course";
import { API_BASE_URL } from "./utils/constants";
import { CourseSummaryListSchema } from "./utils/nusmods";

const now = new Date();
const lastYear = now.getFullYear() - 1;
const currentYear = now.getFullYear();
const nextYear = now.getFullYear() + 1;
const isFirstHalfOfTheYear = now.getMonth() < 6;
export const currentAcadYear = isFirstHalfOfTheYear ? `${lastYear}-${currentYear}` : `${currentYear}-${nextYear}`;

export default function Command() {
  const parseResponse = useCallback(async (res: Response) => {
    if (!res.ok) {
      showFailureToast({
        title: "Failed to fetch course summaries",
        message: "Please try again later.",
      });
      return [];
    }

    const data = await res.json();
    if (!data) {
      showFailureToast({
        title: "Failed to unmarshal course summaries",
        message: "Please try again later.",
      });
      return [];
    }

    const parsedResult = await CourseSummaryListSchema.safeParseAsync(data);
    if (!parsedResult.success) {
      console.error("Validation error:", parsedResult.error);
      showFailureToast({
        title: "Validation error",
        message: "Unexpected course summaries data received from NUSMods API, please report this issue",
      });
      return [];
    }

    return parsedResult.data;
  }, []);

  const { isLoading, data, error } = useFetch(`${API_BASE_URL}/${currentAcadYear}/moduleList.json`, {
    keepPreviousData: true,
    parseResponse,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for courses...">
      {error || !data ? (
        <List.EmptyView icon={Icon.Bug} title="Error fetching course summaries" description="Please try again later." />
      ) : (
        <CourseSummaryList courseSummaries={data} />
      )}
    </List>
  );
}
