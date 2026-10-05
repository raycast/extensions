import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type TransactionResponse = {
  success: boolean;
};

const SUCCESS_CLOSE_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getResponseBody(
  response: Response,
): Promise<TransactionResponse | null> {
  try {
    return (await response.json()) as TransactionResponse;
  } catch {
    return null;
  }
}

export default async function Command({
  arguments: args,
}: LaunchProps<{ arguments: Arguments.RecordTransaction }>) {
  const query = args.query?.trim();
  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing transaction description",
      message: "Describe the transaction in the command argument.",
    });
    return;
  }

  const preferences = getPreferenceValues<Preferences.RecordTransaction>();
  const integrationKey = preferences.integrationKey?.trim();

  if (!integrationKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Integration key not configured",
      message: "Opening extension preferences",
    });
    await openExtensionPreferences();
    return;
  }

  const loadingToast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding transaction...",
  });

  try {
    const response = await fetch(
      "https://web.ducat.money/api/transactions/smart",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Ducat-Integration-Key": integrationKey,
        },
        body: JSON.stringify({ query }),
      },
    );

    const responseBody = await getResponseBody(response);

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Please rephrase your transaction description.");
      }

      if (response.status === 401) {
        throw new Error("Check your integration key in extension preferences.");
      }

      throw new Error(
        `Unexpected error (status ${response.status}). Please try again.`,
      );
    }

    if (responseBody?.success === false) {
      throw new Error("We could not process this transaction description.");
    }

    loadingToast.style = Toast.Style.Success;
    loadingToast.title = "Transaction added.";

    await delay(SUCCESS_CLOSE_DELAY_MS);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, {
      title: "Unable to add transaction. Try again.",
    });
    await loadingToast.hide();
  }
}
