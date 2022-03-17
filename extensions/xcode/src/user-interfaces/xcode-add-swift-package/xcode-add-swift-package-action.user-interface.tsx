import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { ActionPanel, Navigation, showToast, ToastStyle } from "@raycast/api";
import { XcodeAddSwiftPackageSelectXcodeProject } from "./xcode-add-swift-package-select-xcode-project.user-interface";
import { XcodeProject } from "../../models/project/xcode-project.model";

/**
 * Add Swift Package Action
 * @param props The properties
 */
export function AddSwiftPackageAction(props: {
  swiftPackageUrl: string;
  xcodeSwiftPackageService: XcodeSwiftPackageService;
  navigation: Navigation;
  onSelect: (xcodeProject: XcodeProject) => void;
}): JSX.Element {
  return (
    <ActionPanel.Item
      key="add-swift-package-action"
      title="Add Swift Package"
      onAction={() => {
        // Check if Swift Package Url is valid
        if (props.xcodeSwiftPackageService.isSwiftPackageUrlValid(props.swiftPackageUrl)) {
          // Initialize select XcodeProject component
          const selectXcodeProjectComponent = (
            <XcodeAddSwiftPackageSelectXcodeProject
              onSelect={(xcodeProject) => {
                // Pop back as the Select XcodeProject component
                // was previously pushed
                props.navigation.pop();
                // Invoke onSelect with selected XcodeProject
                props.onSelect(xcodeProject);
              }}
            />
          );
          // Push select XcodeProject component
          props.navigation.push(selectXcodeProjectComponent);
        } else {
          // Otherwise show failure Toast
          showToast(ToastStyle.Failure, "Please enter a valid url to a Swift Package");
        }
      }}
    />
  );
}
