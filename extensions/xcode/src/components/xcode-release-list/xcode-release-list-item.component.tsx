import { XcodeRelease } from "../../models/xcode-release/xcode-release.model";
import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { XcodeReleaseListItemDetail } from "./xcode-release-list-item-detail.component";

/**
 * Xcode Release List Item
 */
export function XcodeReleaseListItem(props: { release: XcodeRelease }) {
  return (
    <List.Item
      icon={icon(props.release)}
      title={title(props.release)}
      keywords={keywords(props.release)}
      detail={<XcodeReleaseListItemDetail release={props.release} />}
      actions={
        <ActionPanel>
          {props.release.downloadLink ? (
            <Action.OpenInBrowser icon={Icon.Download} title="Download" url={props.release.downloadLink} />
          ) : null}
          {props.release.releaseNotesLink ? (
            <Action.OpenInBrowser
              icon={Icon.Document}
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
  // Initialize version number
  const versionNumber = Number(xcodeRelease.versionNumber.split(".").at(0));
  // Check if the version number is greater or equal 26
  if (versionNumber >= 26) {
    imageSourceComponents.push("26");
  } else if (versionNumber >= 15) {
    // Use 15
    imageSourceComponents.push("15");
  } else if (versionNumber >= 13) {
    // Use 13
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
 * Retrieve keywords from XcodeRelease
 * @param xcodeRelease The XcodeRelease
 */
function keywords(xcodeRelease: XcodeRelease): string[] {
  const keywords: string[] = [];
  keywords.push(xcodeRelease.versionNumber);
  keywords.push(xcodeRelease.buildNumber);
  keywords.push(...xcodeRelease.sdks.map((sdk) => sdk.version));
  return keywords.filter(Boolean);
}
