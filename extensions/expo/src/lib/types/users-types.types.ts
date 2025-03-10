import { ErrorResponse } from "../types";

export type UsersResponse = UsersSuccess | ErrorResponse;

type UsersSuccess = UsersSuccessItem[];

interface UsersSuccessItem {
  data: Data;
}
interface Data {
  __typename: string;
  meUserActor: MeUserActor;
  experimentation: Experimentation;
}
interface MeUserActor {
  __typename: string;
  id: string;
  username: string;
  profilePhoto: string;
  firstName: string;
  lastName: string;
  isExpoAdmin: boolean;
  primaryAccount: PrimaryAccount;
  accounts: AccountsItem[];
  bestContactEmail: string;
  featureGates: FeatureGates;
  email: string;
  emailVerified: boolean;
  pendingUserInvitations: any[];
  githubUser: GithubUser;
  preferences: Preferences;
}
interface PrimaryAccount {
  id: string;
  name: string;
  __typename: string;
}
export interface AccountsItem {
  __typename: string;
  id: string;
  name: string;
  isDisabled: boolean;
  createdAt: string;
  ownerUserActor: OwnerUserActor | null;
  viewerUserPermission: ViewerUserPermission;
  subscription: Subscription;
}
interface OwnerUserActor {
  __typename: string;
  id: string;
  fullName: string;
  profilePhoto: string;
  username: string;
  email: string;
}
interface ViewerUserPermission {
  permissions: string[];
  role: string;
  userActor: UserActor;
  __typename: string;
}
interface UserActor {
  id: string;
  created: string;
  firstName: string;
  lastName: string;
  profilePhoto: string;
  displayName: string;
  username: string;
  bestContactEmail: string;
  email: string;
  __typename: string;
}
interface Subscription {
  name: string;
  id: string;
  planId: string;
  status: null;
  nextInvoice: null;
  __typename: string;
}
interface FeatureGates {
  "code-signing": boolean;
  "eas-insights-enable-deployment-insights": boolean;
  "enable-notifications-usage-ui": boolean;
  "enable-notification-fcm-v1-credentials-feature-gate": boolean;
  "eas-build-fast-failed-builds-exclusion": boolean;
  "app-nullify-classic-fields": boolean;
  "serverless-deployments": boolean;
  "use-new-orchestrator": boolean;
  logrocket: boolean;
  example: boolean;
}
interface GithubUser {
  id: string;
  githubUserIdentifier: string;
  __typename: string;
}
interface Preferences {
  selectedAccountName: string;
  __typename: string;
}
interface Experimentation {
  userConfig: UserConfig;
  deviceConfig: DeviceConfig;
  deviceExperimentationUnit: string;
  __typename: string;
}
interface UserConfig {
  experiments: any[];
  namespaces: any[];
}
interface DeviceConfig {
  experiments: any[];
  namespaces: any[];
}
