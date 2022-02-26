import { XcodeRelease } from "../../models/release/xcode-release.model";
import { ActionPanel, ActionPanelProps, Image, List, OpenAction } from "@raycast/api";
import { ReactElement } from "react";

/**
 * Xcode Release List Item
 * @param xcodeRelease The XcodeRelease
 * @param index The index used as `key` of the List.Item
 */
export function xcodeReleaseListItem(xcodeRelease: XcodeRelease, index: number): JSX.Element {
  return (
    <List.Item
      key={index.toString()}
      icon={icon(xcodeRelease)}
      title={title(xcodeRelease)}
      subtitle={subtitle(xcodeRelease)}
      accessoryTitle={accessoryTitle(xcodeRelease)}
      keywords={keywords(xcodeRelease)}
      actions={actions(xcodeRelease)}
    />
  );
}

/**
 * Icon for XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function icon(xcodeRelease: XcodeRelease): Image {
  // Initialize image source components
  const imageSourceComponents = ["xcode"];
  // Check if version number starts with 13
  if (xcodeRelease.versionNumber.startsWith("13")) {
    // Push 13
    imageSourceComponents.push("13");
  } else {
    // Otherwise always use 12
    imageSourceComponents.push("12");
  }
  // Check if beta number is available
  if (xcodeRelease.beta) {
    // Push beta
    imageSourceComponents.push("beta");
  }
  // Return Image
  return {
    source: `${imageSourceComponents.join("-")}.png`,
  };
}

/**
 * Retrieve user friendly display title from XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function title(xcodeRelease: XcodeRelease): string {
  // Initialize title components with name and version number
  const titleComponents = [xcodeRelease.name, xcodeRelease.versionNumber];
  // Check if a beta number is available
  if (xcodeRelease.beta) {
    // Push beta number to title components
    titleComponents.push(`Beta ${xcodeRelease.beta}`);
  } else if (xcodeRelease.releaseCandidate) {
    // Otherwise if a release candidate is available
    // initialize the release candidate components
    const releaseCandidateComponents = ["Release Candidate"];
    // Check if release candidate number is greater one
    if (xcodeRelease.releaseCandidate > 1) {
      // Push release candidate number to components
      releaseCandidateComponents.push(xcodeRelease.releaseCandidate.toString());
    }
    // Push joined release candidate components to title component
    titleComponents.push(releaseCandidateComponents.join(" "));
  }
  // Return joined title components
  return titleComponents.join(" ");
}

/**
 * Retrieve subtitle from XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function subtitle(xcodeRelease: XcodeRelease): string {
  // Initialize subtitle components with build number
  const subtitleComponents = [xcodeRelease.buildNumber];
  // Check if a Swift version is available
  if (xcodeRelease.swiftVersion) {
    // Push Swift version
    subtitleComponents.push(`(Swift ${xcodeRelease.swiftVersion})`);
  }
  // Return joined subtitle components
  return subtitleComponents.join(" ");
}

/**
 * Retrieve accessory title from XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function accessoryTitle(xcodeRelease: XcodeRelease): string {
  return xcodeRelease.sdks.map((sdk) => [sdk.name, sdk.version].join(" ")).join(", ");
}

/**
 * Retrieve keywords from XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function keywords(xcodeRelease: XcodeRelease): string[] {
  const keywords: string[] = [];
  keywords.push(xcodeRelease.versionNumber);
  keywords.push(xcodeRelease.buildNumber);
  keywords.push(...xcodeRelease.sdks.map((sdk) => sdk.version));
  return keywords;
}

/**
 * Retrieve actions from XcodeRelease, if available
 * @param xcodeRelease The XcodeRelease
 */
function actions(xcodeRelease: XcodeRelease): ReactElement<ActionPanelProps> | undefined {
  // Initialize ReactElements
  const elements: ReactElement[] = [];
  // Check if a download link is available
  if (xcodeRelease.downloadLink) {
    // Push OpenAction to download the Xcode Release from the Apple Developer portal
    elements.push(<OpenAction key="download" title="Download" target={xcodeRelease.downloadLink} />);
  }
  // Check if a release notes link is available
  if (xcodeRelease.releaseNotesLink) {
    // Push OpenAction to view the Xcode Release notes
    elements.push(
      <OpenAction key="view-release-notes" title="View Release Notes" target={xcodeRelease.releaseNotesLink} />
    );
  }
  // Check if elements are empty
  if (elements.length === 0) {
    // Return no actions
    return undefined;
  }
  // Return ActionPanel
  return <ActionPanel>{elements}</ActionPanel>;
}
