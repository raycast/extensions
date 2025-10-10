import { PriorityEnum } from "@makeplane/plane-node-sdk";

export const priorityNameToEnumMap: Record<string, PriorityEnum> = {
  low: PriorityEnum.Low,
  medium: PriorityEnum.Medium,
  high: PriorityEnum.High,
  urgent: PriorityEnum.Urgent,
  none: PriorityEnum.None,
};

export const priorityEnumToNameMap: Record<PriorityEnum, string> = {
  [PriorityEnum.Low]: "low",
  [PriorityEnum.Medium]: "medium",
  [PriorityEnum.High]: "high",
  [PriorityEnum.Urgent]: "urgent",
  [PriorityEnum.None]: "none",
};
