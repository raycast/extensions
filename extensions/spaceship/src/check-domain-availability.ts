import { LaunchProps, showToast, Toast } from "@raycast/api";
import { API_HEADERS, API_URL, parseResponse } from "./spaceship";
import { CheckDomainAvailabilityResult } from "./types";

export default async function CheckDomainAvailability(
  props: LaunchProps<{ arguments: Arguments.CheckDomainAvailability }>,
) {
  const { domain } = props.arguments;
  const toast = await showToast(Toast.Style.Animated, "Checking", domain);
  try {
    const response = await fetch(`${API_URL}domains/${domain}/available`, {
      headers: API_HEADERS,
    });
    const result = (await parseResponse(response)) as CheckDomainAvailabilityResult;
    toast.style = Toast.Style.Success;
    toast.title = "Checked";
    toast.message = result.result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = `${error}`;
  }
}
