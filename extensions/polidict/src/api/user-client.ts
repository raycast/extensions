import { RestClient } from "./rest-client";

type SubscriptionType = "FREE" | "PLUS";

interface SubscriptionDetails {
  subscriptionType: SubscriptionType;
  endDate?: string;
  canAddLearningItems: boolean;
  canCreateGroups: boolean;
}

interface UserProfileResponse {
  userId: string;
  email: string;
  role: string;
  subscriptionDetails: SubscriptionDetails;
}

export interface UserProfile {
  id: string;
  email: string;
  isPlusUser: boolean;
  canAddLearningItems: boolean;
  canCreateGroups: boolean;
}

export class UserClient {
  constructor(private readonly restClient: RestClient) {}

  async getProfile(): Promise<UserProfile> {
    const response = await this.restClient.get<UserProfileResponse>("/api/profile");
    return {
      id: response.userId,
      email: response.email,
      isPlusUser: response.subscriptionDetails.subscriptionType === "PLUS",
      canAddLearningItems: response.subscriptionDetails.canAddLearningItems,
      canCreateGroups: response.subscriptionDetails.canCreateGroups,
    };
  }
}
