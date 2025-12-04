import { useState } from "react";
import { gitlab } from "../common";
import { Label, Project, searchData } from "../gitlabapi";
import { useCache } from "../cache";
import { LabelList } from "./label";
import { showErrorToast } from "../utils";

export function ProjectLabelList(props: { project: Project; navigationTitle?: string }) {
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
    },
  );

  if (error) {
    showErrorToast(error, "Cannot search Project Labels");
  }

  return (
    <LabelList
      labels={data || []}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={props.navigationTitle}
    />
  );
}
