import { Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useCallback, useState } from "react";
import { CourseSummaryList } from "./components/course";
import { API_BASE_URL } from "./utils/constants";
import { CourseSummaryListSchema } from "./utils/nusmods";

const now = new Date();
const currentYear = now.getFullYear();
const isFirstHalfOfTheYear = now.getMonth() < 8; // New semester starts in August
const currentAcadYear = isFirstHalfOfTheYear
  ? `${currentYear - 1}-${currentYear}`
  : `${currentYear}-${currentYear + 1}`;
const fallbackAcadYear = isFirstHalfOfTheYear // Its possible NUSMods API do not have the current academic year data yet
  ? `${currentYear - 2}-${currentYear - 1}`
  : `${currentYear - 1}-${currentYear}`;

export default function Command() {
  const [acadYear, setAcadYear] = useState(currentAcadYear);

  const parseResponse = useCallback(async (res: Response) => {
    if (!res.ok) {
      if (acadYear !== fallbackAcadYear) {
        console.info("Switching to fallback academic year:", fallbackAcadYear);
        setAcadYear(fallbackAcadYear);
        return [];
      }

      console.error("Failed to fetch course summaries:", res.status, res.statusText);
      showToast({
        title: "Failed to fetch course summaries",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return [];
    }

    const data = await res.json();
    if (!data) {
      console.error("Failed to unmarshal course summaries");
      showToast({
        title: "Failed to unmarshal course summaries",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return [];
    }

    const parsedResult = await CourseSummaryListSchema.safeParseAsync(data);
    if (!parsedResult.success) {
      console.error("Validation error:", parsedResult.error);
      showToast({
        title: "Validation error",
        message: "Unexpected course summaries data received from NUSMods API, please report this issue",
        style: Toast.Style.Failure,
      });
      return [];
    }

    return parsedResult.data;
  }, []);

  const { isLoading, data, error } = useFetch(`${API_BASE_URL}/${acadYear}/moduleList.json`, {
    keepPreviousData: true,
    parseResponse,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Search for courses in ${acadYear.replace("-", "/")}`}>
      {error || !data ? (
        <List.EmptyView icon={Icon.Bug} title="Error fetching course summaries" description="Please try again later." />
      ) : (
        <CourseSummaryList courseSummaries={data} acadYear={acadYear} />
      )}
    </List>
  );
}
