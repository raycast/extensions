import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import got from "got";
import { Response } from "../types/response";

interface Preferences {
  server_url: string;
}

export function usePostDeckName() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit(selectedDeckName: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing deck",
    });

    try {
      const { body }: { body: Response } = await got.post(preferences.server_url, {
        json: {
          action: "createDeck",
          version: 6,
          params: {
            deck: selectedDeckName,
          },
        },
        responseType: "json",
      });

      if (body.error) {
        if (body.error.includes("duplicate")) {
          toast.style = Toast.Style.Failure;
          toast.title = "Cannot Send Deckname";
          toast.message = "Deck is a duplicate";
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed sharing deckname";
          toast.message = body.error;
        }
        return;
      }

      toast.style = Toast.Style.Success;
      toast.title = "Created new Deck";
      toast.message = "Deck has been created successfully";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed creating Deck";
      toast.message = String(error);
    }
  }

  return handleSubmit;
}
