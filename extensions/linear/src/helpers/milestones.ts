import { ProjectMilestone } from "@linear/sdk";
import { Color } from "@raycast/api";

export function getMilestoneIcon(milestone?: Pick<ProjectMilestone, "id" | "name" | "targetDate">) {
  if (!milestone) {
    return { source: "linear-icons/no-milestone.svg", tintColor: Color.SecondaryText };
  }

  return { source: "linear-icons/milestone.svg", tintColor: Color.PrimaryText };
}
