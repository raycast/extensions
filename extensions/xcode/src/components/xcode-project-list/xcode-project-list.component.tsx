import { List } from "@raycast/api";
import { XcodeProjectListItem } from "./xcode-project-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { useState } from "react";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { XcodeProjectListSearchBarAccessory } from "./xcode-project-list-search-bar-accessory.component";

/**
 * Xcode Project List
 */
export function XcodeProjectList(): JSX.Element {
  const { isLoading, data } = useCachedPromise(XcodeProjectService.xcodeProjects);
  const [projectTypeFilter, setProjectTypeFilter] = useState<XcodeProjectType | undefined>(undefined);
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for Xcode Projects or Swift Packages"
      searchBarAccessory={
        <XcodeProjectListSearchBarAccessory key="search-bar-accessory" onChange={setProjectTypeFilter} />
      }
    >
      {data
        ?.filter((xcodeProject) => (projectTypeFilter ? xcodeProject.type === projectTypeFilter : true))
        .map((xcodeProject) => {
          return <XcodeProjectListItem key={xcodeProject.filePath} project={xcodeProject} />;
        })}
    </List>
  );
}
