import { showToast, ToastStyle } from "@raycast/api";
import { WebAPICallError, WebClient } from "@slack/web-api";
import { slackEmojiCodeMap } from "./emojiCodes";
import { SlackStatusPreset, SlackStatusResponseState } from "./interfaces";

export class SlackClient {
  private apiClient: WebClient;
  constructor(accessToken: string) {
    this.apiClient = new WebClient(accessToken);
  }

  getCurrentStatus(currentStatusResponseState: SlackStatusResponseState) {
    const setCurrentStatusResponse = currentStatusResponseState[1];
    Promise.all([this.apiClient.users.profile.get(), this.apiClient.dnd.info()])
      .then(([responseStatus, responseDnd]) => {
        if (responseStatus.ok && responseDnd.ok) {
          const statusEmoji = responseStatus.profile?.status_emoji;
          const statusText = responseStatus.profile?.status_text;

          if (statusText) {
            let expirationTimestamp = responseStatus.profile?.status_expiration;
            if (expirationTimestamp) {
              expirationTimestamp *= 1000;
            }
            setCurrentStatusResponse({
              status: {
                emojiCode: statusEmoji ?? ":speech_balloon:",
                title: statusText,
                expiration: expirationTimestamp,
                dnd: (responseDnd.snooze_enabled as boolean) ?? false,
              },
            });
          } else {
            setCurrentStatusResponse({});
          }
        }
      })
      .catch((error: WebAPICallError) => {
        setCurrentStatusResponse({
          error: error,
        });
        showToast(ToastStyle.Failure, "Failed to fetch status", error.message);
      });
  }

  clearStatus(currentStatusResponseState: SlackStatusResponseState) {
    const profile = {
      status_text: "",
      status_expiration: 0,
      status_emoji: "",
    };
    const setCurrentStatusResponse = currentStatusResponseState[1];
    showToast(ToastStyle.Animated, "Clearing status...");
    Promise.all([
      this.apiClient.users.profile.set({
        profile: JSON.stringify(profile),
      }),
      this.apiClient.dnd.endSnooze().catch((err) => {
        // Slack throws if you call endSnooze when notification aren't paused
        if (err.data.error != "snooze_not_active") throw err;
      }),
    ])
      .then(([response]) => {
        if (response.ok) {
          showToast(ToastStyle.Success, "Status cleared");
          setCurrentStatusResponse({});
        }
      })
      .catch((error: WebAPICallError) => {
        showToast(ToastStyle.Failure, "Failed to clear status", error.message);
      });
  }

  setStatusFromPreset(
    statusPreset: SlackStatusPreset,
    currentStatusResponseState: SlackStatusResponseState,
    customDuration?: number,
    onCompletion?: (isSuccess: boolean) => void
  ) {
    const setCurrentStatusResponse = currentStatusResponseState[1];
    const durationInMinutes = customDuration ?? statusPreset?.defaultDuration ?? -1;
    let expirationTimestamp = 0;
    if (durationInMinutes > 0) {
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + durationInMinutes);
      expirationTimestamp = Math.floor(expirationDate.getTime() / 1000);
    }
    const profile = {
      status_text: statusPreset.title,
      status_expiration: expirationTimestamp,
      status_emoji: statusPreset.emojiCode,
    };
    showToast(ToastStyle.Animated, "Setting status...");

    const queries = [
      this.apiClient.users.profile.set({
        profile: JSON.stringify(profile),
      }),
    ];
    if (statusPreset.dnd) {
      queries.push(
        this.apiClient.dnd.setSnooze({
          num_minutes: durationInMinutes > 0 ? durationInMinutes : 1440, // max 24h
        })
      );
    }

    Promise.all(queries)
      .then(([response]) => {
        if (response.ok) {
          const emoji = slackEmojiCodeMap[statusPreset.emojiCode] ?? "💬";
          const message = `${emoji} ${statusPreset.title}`;
          showToast(ToastStyle.Success, "Status updated", message);
          setCurrentStatusResponse({
            status: {
              emojiCode: statusPreset.emojiCode,
              title: statusPreset.title,
              expiration: expirationTimestamp * 1000,
              dnd: statusPreset.dnd,
            },
          });
          if (onCompletion) {
            onCompletion(true);
          }
        }
      })
      .catch((error: WebAPICallError) => {
        showToast(ToastStyle.Failure, "Failed to update status", error.message);
        if (onCompletion) {
          onCompletion(false);
        }
      });
  }
}
