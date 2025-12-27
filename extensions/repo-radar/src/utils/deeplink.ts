import { createDeeplink } from "@raycast/utils";

// ============================================
// Deeplink Utilities
// ============================================

export function createProjectDeeplink(projectId: string): string {
  return createDeeplink({
    command: "open-project",
    context: {
      projectId,
    },
  });
}
