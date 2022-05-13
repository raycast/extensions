import { confirmAlert } from "@raycast/api";

export async function changeApiKeyAlert(onChangeApiKey: () => void) {
  await confirmAlert({
    title: "Are you sure you want to change your API key?",
    primaryAction: {
      title: "Yes",
      onAction: onChangeApiKey,
    },
  });
}
