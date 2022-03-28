import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { gitlab } from "../common";
import { Label, Project, searchData } from "../gitlabapi";
import { useCache } from "../cache";
import { LabelList } from "./label";

export function ProjectLabelList(props: { project: Project }): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Label[]>(
    `project_${props.project.id}_labels`,
    async () => {
      return gitlab.getProjectLabels(props.project.id);
    },
    {
      deps: [searchText, props.project],
      onFilter: async (labels) => {
        return searchData<Label[]>(labels, {
          search: searchText || "",
          keys: ["name"],
          limit: 50,
        });
      },
    }
  );

  if (error) {
    showToast(Toast.Style.Failure, "Cannot search Project labels", error);
  }

  if (!data) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return <LabelList labels={data} onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true} />;
}
