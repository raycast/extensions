import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getOrcidId, getReadPublicToken, getApiBaseUrl } from "./oauth";

export default async function Command() {
  try {
    const token = await getReadPublicToken();
    const orcidId = await getOrcidId();

    const response = await fetch(`${getApiBaseUrl()}/${orcidId}/person`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      name?: {
        "credit-name"?: { value: string };
        "given-names"?: { value: string };
        "family-name"?: { value: string };
      };
    };

    let displayName = "Unknown";
    if (data.name?.["credit-name"]?.value) {
      displayName = data.name["credit-name"].value;
    } else {
      const givenNames = data.name?.["given-names"]?.value ?? "";
      const familyName = data.name?.["family-name"]?.value ?? "";
      displayName = `${givenNames} ${familyName}`.trim() || "Unknown";
    }

    await Clipboard.copy(displayName);
    await showHUD(`Copied: ${displayName}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch name",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
