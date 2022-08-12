import { XcodeRelease } from "../../models/xcode-release/xcode-release.model";
import { ActionPanel, Action, Image, List } from "@raycast/api";

/**
 * Xcode Release List Item
 */
export function XcodeReleaseListItem(props: { release: XcodeRelease; index: number }): JSX.Element {
  return (
    <List.Item
      key={props.index}
      icon={icon(props.release)}
      title={title(props.release)}
      subtitle={subtitle(props.release)}
      accessories={[{ text: accessoryTitle(props.release) }]}
      keywords={keywords(props.release)}
      actions={
        <ActionPanel>
          {props.release.downloadLink ? (
            <Action.OpenInBrowser key="download" title="Download" url={props.release.downloadLink} />
          ) : null}
          {props.release.releaseNotesLink ? (
            <Action.OpenInBrowser
              key="view-release-notes"
              title="View Release Notes"
              url={props.release.releaseNotesLink}
            />
          ) : null}
        </ActionPanel>
      }
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
  // Check if version number is greater or equal 13
  if (Number(xcodeRelease.versionNumber.split(".").at(0)) >= 13) {
    // Push 13
    imageSourceComponents.push("13");
  } else {
    // Otherwise, always use 12
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
 * Retrieve user-friendly display title from XcodeRelease
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
    // Otherwise, if a release candidate is available
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
  return keywords.filter((keyword) => !!keyword);
}
