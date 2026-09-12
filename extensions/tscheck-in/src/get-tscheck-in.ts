import { Alert, Clipboard, confirmAlert, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { UUID } from "crypto";
import got from "got";

const TSCHECK_IN_API = "https://tscheck.in/api/generate";
const LOADING_TEXT = "Generating Question";

type TscheckIn = {
  english: string;
  german: string;
  id: number;
  isHumanApproved: boolean;
  keywords: {
    mood: string;
    purpose: string;
    situation: string;
    group: string;
  };
  level: 0 | 1 | 2 | 3 | 4;
  uuid: UUID;
};

type Preferences = {
  displayMode: "alert" | "toast" | "hud";
  defaultAction: "copy" | "paste";
};

async function getTscheckIn() {
  try {
    const response = await got(TSCHECK_IN_API, {
      headers: {
        accept: "application/json",
        "sec-ch-ua-platform": '"Raycast"',
        Referer: "https://tscheck.in/",
      },
      json: { level: 0 },
      method: "POST",
    });
    return JSON.parse(response.body) as TscheckIn;
  } catch (error) {
    showFailureToast(error, { title: "Failed to access tscheck.in", message: String(error) });
  }
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: LOADING_TEXT,
  });

  const prompt = await getTscheckIn();

  if (prompt && prompt.english) {
    toast.hide();
    const copyAction = {
      title: "Copy to Clipboard",
      onAction: () => Clipboard.copy(prompt.english),
    };
    const pasteAction = {
      title: "Paste to frontmost App",
      onAction: () => Clipboard.paste(prompt.english),
    };

    switch (preferences.displayMode) {
      case "hud":
        if (preferences.defaultAction === "copy") {
          Clipboard.copy(prompt.english);
        } else {
          Clipboard.paste(prompt.english);
        }
        await showHUD(prompt.english || "");
        break;
      case "toast": {
        await showToast({
          title: prompt.english || "",
          primaryAction: preferences.defaultAction === "copy" ? copyAction : pasteAction,
          secondaryAction: preferences.defaultAction === "copy" ? pasteAction : copyAction,
        });
        break;
      }
      default: {
        const options: Alert.Options = {
          title: prompt.english,
          primaryAction: preferences.defaultAction === "copy" ? copyAction : pasteAction,
          dismissAction: { title: "Done" },
        };
        await confirmAlert(options);
      }
    }
  }
}
