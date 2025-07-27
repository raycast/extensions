import { ErrorResponse } from "../types";

export type AppleDevicesResponse = AppleDevicesSuccess | ErrorResponse;

type AppleDevicesSuccess = AppleDevicesSuccessItem[];

interface AppleDevicesSuccessItem {
  data: Data;
}
interface Data {
  account: Account;
}
interface Account {
  byName: ByName;
  __typename: string;
}
interface ByName {
  id: string;
  appleDevicesPaginated?: AppleDevicesPaginated;
  __typename: string;
  appleTeamsPaginated?: AppleTeamsPaginated;
}
interface AppleDevicesPaginated {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}
interface EdgesItem {
  node: Node;
  __typename: string;
}
interface Node {
  __typename: string;
  id: string;
  appleTeam?: AppleTeam;
  identifier?: string;
  name?: null;
  model?: string;
  deviceClass?: string;
  softwareVersion?: string;
  enabled?: boolean;
  createdAt?: string;
  appleTeamIdentifier?: string;
  appleTeamName?: string;
}
interface AppleTeam {
  id: string;
  appleTeamIdentifier: string;
  appleTeamName: string;
  __typename: string;
}
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
  __typename: string;
}
interface AppleTeamsPaginated {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}

// Edit Apple Device Name

export type EditAppleDeviceNameResponse = EditAppleDeviceNameSuccess | ErrorResponse;

type EditAppleDeviceNameSuccess = EditAppleDeviceNameSuccessItem[];

interface EditAppleDeviceNameSuccessItem {
  data: Data;
}
interface Data {
  appleDevice: AppleDevice;
}
interface AppleDevice {
  updateAppleDevice: UpdateAppleDevice;
  __typename: string;
}
interface UpdateAppleDevice {
  __typename: string;
  id: string;
  appleTeam: AppleTeam;
  identifier: string;
  name: string;
  model: string;
  deviceClass: string;
  softwareVersion: string;
  enabled: boolean;
  createdAt: string;
}
interface AppleTeam {
  id: string;
  appleTeamIdentifier: string;
  appleTeamName: string;
  __typename: string;
}

// Register Apple Device

export type RegisterAppleDeviceResponse = RegisterAppleDeviceSuccess | ErrorResponse;

type RegisterAppleDeviceSuccess = RegisterAppleDeviceSuccessItem[];

interface RegisterAppleDeviceSuccessItem {
  data: Data;
}
interface Data {
  appleDeviceRegistrationRequest: AppleDeviceRegistrationRequest;
}
interface AppleDeviceRegistrationRequest {
  createAppleDeviceRegistrationRequest: CreateAppleDeviceRegistrationRequest;
  __typename: string;
}
interface CreateAppleDeviceRegistrationRequest {
  id: string;
  __typename: string;
}
