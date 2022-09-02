import { SwiftPackageIndexSearchResult } from "../../models/swift-package-index/swift-package-index-search-result.model";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { SwiftPackageIndexListItemDetail } from "./swift-package-index-list-item-detail.component";
import { XcodeAddSwiftPackage } from "../xcode-add-swift-package/xcode-add-swift-package.component";

/**
 * Swift Package Index List Item
 */
export function SwiftPackageIndexListItem(props: {
  searchResult: SwiftPackageIndexSearchResult;
  isAddToXcodeActionVisible: boolean;
}): JSX.Element {
  const navigation = useNavigation();
  return (
    <List.Item
      id={props.searchResult.id}
      key={props.searchResult.id}
      title={props.searchResult.name}
      accessories={[{ text: String(props.searchResult.stars), icon: Icon.Star }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.searchResult.url} />
          {props.isAddToXcodeActionVisible ? (
            <Action
              key="add-to-xcode-project"
              title="Add to Xcode Project"
              icon={Icon.Plus}
              onAction={() => navigation.push(<XcodeAddSwiftPackage url={props.searchResult.url} />)}
            />
          ) : undefined}
          <Action.CopyToClipboard content={props.searchResult.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
        </ActionPanel>
      }
      detail={<SwiftPackageIndexListItemDetail searchResult={props.searchResult} />}
    />
  );
}
