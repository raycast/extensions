import axios from "axios";
import { IFormData } from "../interfaces/interfaces";
import { showToast, Toast } from "@raycast/api";

export function triggerEvent(data: IFormData) {
  return axios
    .post(
      `${data.requestDomain}/v1/events/trigger`,
      {
        name: data.notificationIdentifier,
        to: data.subscriberId,
        payload: JSON.parse(data.payload),
      },
      {
        headers: {
          Authorization: `ApiKey ${data.apiKey}`,
        },
      }
    )
    .then((response) => response.data?.data)
    .then((response) => triggerSentToast())
    .catch((error) => {
      return Promise.reject(error);
    });
}

export async function triggerSentToast() {
  await showToast({
    style: Toast.Style.Success,
    title: "Trigger sent",
  });
}
