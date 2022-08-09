import { List } from "@raycast/api";
import { XcodeProjectListItem } from "./xcode-project-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";

/**
 * Xcode Project List
 */
export function XcodeProjectList(): JSX.Element {
  const { isLoading, data } = useCachedPromise(XcodeProjectService.xcodeProjects);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for Xcode Projects or Swift Packages">
      {data?.map((xcodeProject) => {
        return <XcodeProjectListItem key={xcodeProject.filePath} project={xcodeProject} />;
      })}
    </List>
  );
}
