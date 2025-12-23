import { Icon, List } from "@raycast/api";
import { showFailureToast, useStreamJSON } from "@raycast/utils";
import * as z from "@zod/mini";
import { useCallback, useState } from "react";
import { CourseSummaryList } from "./components/course";
import { API_BASE_URL } from "./utils/constants";
import { CourseSummary, CourseSummarySchema } from "./utils/nusmods";

const now = new Date();
const currentYear = now.getFullYear();
const isFirstHalfOfTheYear = now.getMonth() + 1 < 7; // New semester starts in August, but NUSMods data is updated in July
const currentAcadYear = isFirstHalfOfTheYear
  ? `${currentYear - 1}-${currentYear}`
  : `${currentYear}-${currentYear + 1}`;
const fallbackAcadYear = isFirstHalfOfTheYear // Its possible NUSMods API do not have the current academic year data yet
  ? `${currentYear - 2}-${currentYear - 1}`
  : `${currentYear - 1}-${currentYear}`;

export default function Command() {
  const [acadYear, setAcadYear] = useState(currentAcadYear);

  const onError = useCallback((error: Error) => {
    if (acadYear !== fallbackAcadYear) {
      console.info("Switching to fallback academic year:", fallbackAcadYear);
      setAcadYear(fallbackAcadYear);
      return;
    }

    console.error("Error fetching course summaries:", error);
    showFailureToast(error, {
      title: "Error fetching course summaries",
      message: "Please try again later.",
    });
  }, []);

  const [searchText, setSearchText] = useState("");

  const filter = useCallback(
    (item: CourseSummary | null) => {
      if (!item) return false;
      if (!searchText) return true;

      const searchTextLower = searchText.toLocaleLowerCase();

      if (item.moduleCode.toLocaleLowerCase().includes(searchTextLower)) return true;
      if (item.title.toLocaleLowerCase().includes(searchTextLower)) return true;

      return false;
    },
    [searchText],
  );

  const transform = useCallback((item: unknown) => {
    const parsedResult = CourseSummarySchema.safeParse(item);
    if (!parsedResult.success) {
      console.error(z.prettifyError(parsedResult.error));
      return null;
    }
    return parsedResult.data;
  }, []);

  const { isLoading, data, error, pagination } = useStreamJSON(`${API_BASE_URL}/${acadYear}/moduleList.json`, {
    keepPreviousData: true,
    filter,
    transform,
    onError,
  });

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      pagination={pagination}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search for courses in ${acadYear.replace("-", "/")}`}
    >
      {error || !data ? (
        <List.EmptyView icon={Icon.Bug} title="Error fetching course summaries" description="Please try again later." />
      ) : (
        <CourseSummaryList courseSummaries={data as CourseSummary[]} acadYear={acadYear} />
      )}
    </List>
  );
}
