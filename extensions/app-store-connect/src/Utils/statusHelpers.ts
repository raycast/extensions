import { Color, Icon } from "@raycast/api";

interface StatusInfo {
  color: Color;
  icon: Icon;
  label: string;
}

const STATUS_MAP: Record<string, StatusInfo> = {
  // Active / positive
  READY_FOR_SALE: { color: Color.Green, icon: Icon.CheckCircle, label: "Ready for Sale" },
  READY_FOR_DISTRIBUTION: { color: Color.Green, icon: Icon.CheckCircle, label: "Ready for Distribution" },
  PREORDER_READY_FOR_SALE: { color: Color.Green, icon: Icon.CheckCircle, label: "Pre-order Ready" },
  PENDING_APPLE_RELEASE: { color: Color.Green, icon: Icon.Clock, label: "Pending Apple Release" },
  PENDING_DEVELOPER_RELEASE: { color: Color.Blue, icon: Icon.Rocket, label: "Pending Developer Release" },
  ACCEPTED: { color: Color.Blue, icon: Icon.CheckCircle, label: "Accepted" },

  // In progress
  IN_REVIEW: { color: Color.Orange, icon: Icon.Eye, label: "In Review" },
  WAITING_FOR_REVIEW: { color: Color.Yellow, icon: Icon.Hourglass, label: "Waiting for Review" },
  READY_FOR_REVIEW: { color: Color.Yellow, icon: Icon.ArrowRight, label: "Ready for Review" },
  PROCESSING_FOR_APP_STORE: { color: Color.Yellow, icon: Icon.CircleProgress, label: "Processing" },
  PROCESSING_FOR_DISTRIBUTION: { color: Color.Yellow, icon: Icon.CircleProgress, label: "Processing" },
  WAITING_FOR_EXPORT_COMPLIANCE: { color: Color.Yellow, icon: Icon.Document, label: "Export Compliance" },

  // Preparation
  PREPARE_FOR_SUBMISSION: { color: Color.SecondaryText, icon: Icon.Pencil, label: "Prepare for Submission" },

  // Negative / problem
  REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Rejected" },
  METADATA_REJECTED: { color: Color.Red, icon: Icon.XMarkCircle, label: "Metadata Rejected" },
  INVALID_BINARY: { color: Color.Red, icon: Icon.ExclamationMark, label: "Invalid Binary" },
  DEVELOPER_REJECTED: { color: Color.Orange, icon: Icon.XMarkCircle, label: "Developer Rejected" },

  // Removed / inactive
  REMOVED_FROM_SALE: { color: Color.SecondaryText, icon: Icon.Minus, label: "Removed from Sale" },
  DEVELOPER_REMOVED_FROM_SALE: { color: Color.SecondaryText, icon: Icon.Minus, label: "Developer Removed" },
  REPLACED_WITH_NEW_VERSION: { color: Color.SecondaryText, icon: Icon.ArrowClockwise, label: "Replaced" },

  // Pending
  PENDING_CONTRACT: { color: Color.Yellow, icon: Icon.Document, label: "Pending Contract" },
};

const COMPACT_MAP: Record<string, string> = {
  READY_FOR_SALE: "Ready",
  READY_FOR_DISTRIBUTION: "Ready",
  PREORDER_READY_FOR_SALE: "Pre-order",
  PENDING_APPLE_RELEASE: "Apple Release",
  PENDING_DEVELOPER_RELEASE: "Dev Release",
  ACCEPTED: "Accepted",
  IN_REVIEW: "In Review",
  WAITING_FOR_REVIEW: "Waiting",
  READY_FOR_REVIEW: "Ready Review",
  PROCESSING_FOR_APP_STORE: "Processing",
  PROCESSING_FOR_DISTRIBUTION: "Processing",
  WAITING_FOR_EXPORT_COMPLIANCE: "Compliance",
  PREPARE_FOR_SUBMISSION: "Prepare",
  REJECTED: "Rejected",
  METADATA_REJECTED: "Meta Rejected",
  INVALID_BINARY: "Invalid Binary",
  DEVELOPER_REJECTED: "Dev Rejected",
  REMOVED_FROM_SALE: "Removed",
  DEVELOPER_REMOVED_FROM_SALE: "Dev Removed",
  REPLACED_WITH_NEW_VERSION: "Replaced",
  PENDING_CONTRACT: "Contract",
};

export function getStatusInfo(state: string): StatusInfo {
  return (
    STATUS_MAP[state] || {
      color: Color.SecondaryText,
      icon: Icon.QuestionMark,
      label: state.replace(/_/g, " "),
    }
  );
}

export function getCompactStatusLabel(state: string): string {
  return COMPACT_MAP[state] || prettify(state);
}

export function getPlatformIcon(platform: string): Icon {
  switch (platform) {
    case "IOS":
      return Icon.Mobile;
    case "MAC_OS":
      return Icon.Monitor;
    case "TV_OS":
      return Icon.Desktop;
    case "VISION_OS":
      return Icon.Eye;
    default:
      return Icon.AppWindow;
  }
}

export function getPlatformLabel(platform: string): string {
  switch (platform) {
    case "IOS":
      return "iOS";
    case "MAC_OS":
      return "macOS";
    case "TV_OS":
      return "tvOS";
    case "VISION_OS":
      return "visionOS";
    default:
      return platform;
  }
}

function prettify(state: string): string {
  return state
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Human label for a build's `processingState`.
 *
 * Only a VALID build can be attached to a beta group; App Store Connect rejects the
 * others with an error that doesn't name the state, so it is worth showing up front.
 */
export function processingStateLabel(state: string): string {
  switch (state) {
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Processing Failed";
    case "INVALID":
      return "Invalid";
    case "VALID":
      return "Ready";
    default:
      return state.replace(/_/g, " ");
  }
}

/** A prerelease version identified for display, e.g. "iOS 1.0". */
export interface VersionWithPlatform {
  id: string;
  platform: string;
  version: string;
}

/**
 * Labels a version with its platform, e.g. "iOS 1.0".
 *
 * Returns "" for an unselected version so it can be used directly as a dropdown value.
 */
export function platformWithVersion(version: VersionWithPlatform | undefined): string {
  return version ? `${getPlatformLabel(version.platform)} ${version.version}` : "";
}
