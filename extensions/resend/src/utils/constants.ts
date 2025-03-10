import { getPreferenceValues } from "@raycast/api";

export const RESEND_URL = "https://resend.com/";
export const API_URL = "https://api.resend.com/";

export const API_KEY = getPreferenceValues<ExtensionPreferences>().api_key;

export const API_HEADERS = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

export const CREATE_API_KEY_PERMISSIONS = [
  { title: "Full access", value: "full_access", description: "Can create, delete, get, and update any resource." },
  { title: "Sending access", value: "sending_access", description: "Can only send emails." },
];

export const ADD_DOMAIN_REGIONS = [
  { title: "North Virginia (us-east-1)", icon: "us.svg", value: "us-east-1" },
  { title: "Ireland (eu-west-1)", icon: "ie.svg", value: "eu-west-1" },
  { title: "São Paulo (sa-east-1)", icon: "br.svg", value: "sa-east-1" },
  { title: "Tokyo (ap-northeast-1)", icon: "jp.svg", value: "ap-northeast-1" },
];
