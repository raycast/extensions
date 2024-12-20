import { Color } from "@raycast/api";
import { ResearchProject } from "../types";

export function getStatusColor(status: ResearchProject["status"]): Color {
  switch (status) {
    case "not_started":
      return Color.Red;
    case "in_progress":
      return Color.Yellow;
    case "completed":
      return Color.Green;
  }
}

export function capitalizeStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getStepColor(stepIndex: number, currentStep: number): Color {
  if (stepIndex < currentStep) return Color.Green;
  if (stepIndex === currentStep) return Color.Yellow;
  return Color.SecondaryText;
}

export function areAllTopicsResearched(topics: ResearchProject["parsedTopics"]): boolean {
  return topics?.every((topic) => topic.researchContent) ?? false;
}

export function generateProjectId(): string {
  return Date.now().toString();
}
