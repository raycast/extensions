import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { List } from "@raycast/api";
import { XcodeProjectTypeName } from "../../shared/xcode-project-type-name";

/**
 * Xcode Project List Search Bar Accessory
 */
export function XcodeProjectListSearchBarAccessory(props: {
  storeDropdownFilterValue?: boolean;
  projectTypeFilter?: (xcodeProjectType: XcodeProjectType) => boolean;
  onChange: (projectTypeFilter: XcodeProjectType | undefined) => void;
}) {
  return (
    <List.Dropdown
      onChange={(projectType) =>
        props.onChange(projectType ? XcodeProjectType[projectType as keyof typeof XcodeProjectType] : undefined)
      }
      storeValue={props.storeDropdownFilterValue ? true : false}
      tooltip="Filter projects by type"
    >
      <List.Dropdown.Item key="all" value={""} title="All" />
      {Object.keys(XcodeProjectType)
        .filter((projectType) =>
          props.projectTypeFilter
            ? props.projectTypeFilter(XcodeProjectType[projectType as keyof typeof XcodeProjectType])
            : true
        )
        .map((projectType) => (
          <List.Dropdown.Item
            key={projectType}
            value={projectType}
            title={XcodeProjectTypeName(XcodeProjectType[projectType as keyof typeof XcodeProjectType])}
          />
        ))}
    </List.Dropdown>
  );
}
