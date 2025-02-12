import { Member } from "./Member";

export interface Project {
  id: string;
  displayName: string;
  studioHost: string | null;
  organizationId: string | null;
  metadata: {
    color?: string;
    externalStudioHost?: string;
    integration?: string;
    initialTemplate?: string;
  };
  isBlocked: boolean;
  isDisabled: boolean;
  isDisabledByUser: boolean;
  activityFeedEnabled: boolean;
  createdAt: Date;
  members: Member[];
  features: string[];
}
