import { Color, Icon } from "@raycast/api";
import { AppStoreState, Platform } from "../types";

interface StatusInfo {
  color: Color;
  icon: Icon;
  label: string;
}

export function getStatusInfo(state: AppStoreState): StatusInfo {
  const statusMap: Record<AppStoreState, StatusInfo> = {
    // Active/Positive states
    READY_FOR_SALE: {
      color: Color.Green,
      icon: Icon.CheckCircle,
      label: "✅ Ready for Sale",
    },
    PREORDER_READY_FOR_SALE: {
      color: Color.Green,
      icon: Icon.CheckCircle,
      label: "🛒 Pre-order Ready",
    },
    PENDING_APPLE_RELEASE: {
      color: Color.Green,
      icon: Icon.Clock,
      label: "🍎 Pending Apple Release",
    },
    PENDING_DEVELOPER_RELEASE: {
      color: Color.Blue,
      icon: Icon.Clock,
      label: "🚀 Pending Developer Release",
    },

    // In Progress states
    IN_REVIEW: {
      color: Color.Orange,
      icon: Icon.Eye,
      label: "👀 In Review",
    },
    WAITING_FOR_REVIEW: {
      color: Color.Yellow,
      icon: Icon.Clock,
      label: "⏳ Waiting for Review",
    },
    READY_FOR_REVIEW: {
      color: Color.Yellow,
      icon: Icon.ArrowRight,
      label: "📤 Ready for Review",
    },
    PROCESSING_FOR_APP_STORE: {
      color: Color.Yellow,
      icon: Icon.CircleProgress,
      label: "⚙️ Processing",
    },
    WAITING_FOR_EXPORT_COMPLIANCE: {
      color: Color.Yellow,
      icon: Icon.Clock,
      label: "📋 Export Compliance",
    },

    // Preparation states
    PREPARE_FOR_SUBMISSION: {
      color: Color.SecondaryText,
      icon: Icon.Pencil,
      label: "✏️ Prepare for Submission",
    },
    ACCEPTED: {
      color: Color.Blue,
      icon: Icon.CheckCircle,
      label: "👍 Accepted",
    },

    // Negative/Problem states
    REJECTED: {
      color: Color.Red,
      icon: Icon.XMarkCircle,
      label: "❌ Rejected",
    },
    METADATA_REJECTED: {
      color: Color.Red,
      icon: Icon.XMarkCircle,
      label: "❌ Metadata Rejected",
    },
    INVALID_BINARY: {
      color: Color.Red,
      icon: Icon.ExclamationMark,
      label: "⚠️ Invalid Binary",
    },
    DEVELOPER_REJECTED: {
      color: Color.Orange,
      icon: Icon.XMarkCircle,
      label: "🚫 Developer Rejected",
    },

    // Removed/Inactive states
    REMOVED_FROM_SALE: {
      color: Color.SecondaryText,
      icon: Icon.Minus,
      label: "🗑️ Removed from Sale",
    },
    DEVELOPER_REMOVED_FROM_SALE: {
      color: Color.SecondaryText,
      icon: Icon.Minus,
      label: "🗑️ Developer Removed",
    },
    REPLACED_WITH_NEW_VERSION: {
      color: Color.SecondaryText,
      icon: Icon.ArrowClockwise,
      label: "🔄 Replaced",
    },

    // Pending states
    PENDING_CONTRACT: {
      color: Color.Yellow,
      icon: Icon.Document,
      label: "📝 Pending Contract",
    },
  };

  return (
    statusMap[state] || {
      color: Color.SecondaryText,
      icon: Icon.QuestionMark,
      label: "❓ " + state.replace(/_/g, " "),
    }
  );
}

export function getPlatformIcon(platform: Platform): Icon {
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

export function getPlatformLabel(platform: Platform): string {
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
