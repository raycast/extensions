import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import got from "got";
import { Response } from "../types/response";

interface Preferences {
  server_url: string;
}

export function usePostNote(selectedDeckName: string, frontContent: string, backContent: string) {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(values: { front: string; back: string }) {
    if (!values.front) {
      showToast({
        style: Toast.Style.Failure,
        title: "Front content is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing note",
    });

    try {
      const { body }: { body: Response } = await got.post(preferences.server_url, {
        json: {
          action: "addNote",
          version: 6,
          params: {
            note: {
              deckName: selectedDeckName,
              modelName: "Basic",
              fields: {
                Front: frontContent,
                Back: backContent,
              },
            },
          },
        },
        responseType: "json",
      });

      if (body.error) {
        if (body.error.includes("duplicate")) {
          toast.style = Toast.Style.Failure;
          toast.title = "Cannot Send Note";
          toast.message = "Note is a duplicate";
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed sharing note";
          toast.message = body.error;
        }
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Shared Note";
      toast.message = "Note has been shared successfully";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing note";
      toast.message = String(error);
    }
  }

  return handleSubmit;
}
