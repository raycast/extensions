import {XcodeSwiftPackageMetadata} from "../../models/swift-package/xcode-swift-package-metadata.model";
import {Icon, List} from "@raycast/api";

/**
 * Swift Package Metadata ListSection
 * @param swiftPackageMetadata The XcodeSwiftPackageMetadata
 */
export function swiftPackageMetadataSection(
  swiftPackageMetadata: XcodeSwiftPackageMetadata
): JSX.Element {
  const listItems: JSX.Element[] = [];
  if (swiftPackageMetadata.name) {
    listItems.push(
      <List.Item
        id="name"
        title={swiftPackageMetadata.name}
        subtitle={swiftPackageMetadata.description}
      />
    );
  }
  if (swiftPackageMetadata.starsCount) {
    listItems.push(
      <List.Item
        id="stars" icon={Icon.Star}
        title="Stars"
        subtitle={swiftPackageMetadata.starsCount?.toString()}
      />
    );
  }
  if (swiftPackageMetadata.license) {
    listItems.push(
      <List.Item
        id="license" icon={Icon.TextDocument}
        title="License"
        subtitle={swiftPackageMetadata.license}
      />
    );
  }
  return (
    <List.Section
      title="Information">
      {listItems}
    </List.Section>
  )
}
