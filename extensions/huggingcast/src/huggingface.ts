import { preferences, showToast, ToastStyle } from "@raycast/api";
import fetch, { Headers } from "node-fetch";

const headers = new Headers({
  Authorization: "Bearer " + preferences.token.value,
});

const endpoint = "https://api-inference.huggingface.co/models/";

export const summarize = async (text: string, model: string): Promise<string> => {
  try {
    const response = await fetch(endpoint + model, {
      method: "post",
      headers: headers,
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
        },
      }),
    });
    const json = (await response.json()) as { error: string } & Array<{ summary_text: string }>;

    if (json.error) {
      showToast(ToastStyle.Failure, json.error);
      return "";
    }
    return json[0].summary_text;
  } catch (err) {
    console.log(err);
    showToast(ToastStyle.Failure, "Failed to fetch summary");
    throw new Error("Failed to fetch summary");
  }
};
