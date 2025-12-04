import { Color, getPreferenceValues } from "@raycast/api";
import { DomainRegion, DomainStatus } from "resend";

export const RESEND_URL = "https://resend.com/";

export const API_KEY = getPreferenceValues<ExtensionPreferences>().api_key;

export const CREATE_API_KEY_PERMISSIONS = [
  { title: "Full access", value: "full_access", description: "Can create, delete, get, and update any resource." },
  { title: "Sending access", value: "sending_access", description: "Can only send emails." },
];

export const ADD_DOMAIN_REGIONS: Array<{ title: string; icon: string; value: DomainRegion }> = [
  { title: "North Virginia (us-east-1)", icon: "us.svg", value: "us-east-1" },
  { title: "Ireland (eu-west-1)", icon: "ie.svg", value: "eu-west-1" },
  { title: "São Paulo (sa-east-1)", icon: "br.svg", value: "sa-east-1" },
  { title: "Tokyo (ap-northeast-1)", icon: "jp.svg", value: "ap-northeast-1" },
];
export const DOMAIN_STATUS_COLORS: Record<DomainStatus, Color> = {
  verified: Color.Green,
  pending: Color.Yellow,
  not_started: Color.Orange,
  failed: Color.Red,
  temporary_failure: Color.Orange,
};
