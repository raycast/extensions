import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { addToMySavedTracks } from "../api/addToMySavedTracks";
import { getErrorMessage } from "../helpers/getError";
import { useContainsMyLikedTracks } from "../hooks/useContainsMyLikedTracks";
import { removeFromMySavedTracks } from "../api/removeFromMySavedTracks";

type AddToSavedTracksActionProps = {
  trackId?: string;
};

export function AddToSavedTracksAction({ trackId: trackId }: AddToSavedTracksActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: trackId ? [trackId] : [],
  });
  const trackAlreadyLiked = containsMySavedTracksData?.[0];

  return (
    <>
      {trackAlreadyLiked && (
        <Action
          icon={Icon.HeartDisabled}
          title="Dislike"
          onAction={async () => {
            if (closeWindowOnAction) {
              try {
                await removeFromMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await showHUD("Disliked");
                await popToRoot();
                return;
              } catch (err) {
                const error = getErrorMessage(err);
                await showHUD(error);
              }
            }
            const toast = await showToast({ title: "Disliking...", style: Toast.Style.Animated });
            try {
              await removeFromMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              await containsMySavedTracksRevalidate();
              toast.title = "Disliked";
              toast.style = Toast.Style.Success;
            } catch (err) {
              const error = getErrorMessage(err);
              toast.style = Toast.Style.Failure;
              toast.title = "Something went wrong";
              toast.message = error;
            }
          }}
        />
      )}

      {!trackAlreadyLiked && (
        <Action
          icon={Icon.Heart}
          title="Like"
          onAction={async () => {
            if (closeWindowOnAction) {
              try {
                await addToMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await showHUD("Liked");
                await popToRoot();
                return;
              } catch (err) {
                const error = getErrorMessage(err);
                await showHUD(error);
              }
            }
            const toast = await showToast({ title: "Liking...", style: Toast.Style.Animated });
            try {
              await addToMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              await containsMySavedTracksRevalidate();
              toast.title = "Liked";
              toast.style = Toast.Style.Success;
            } catch (err) {
              const error = getErrorMessage(err);
              toast.style = Toast.Style.Failure;
              toast.title = "Something went wrong";
              toast.message = error;
            }
          }}
        />
      )}
    </>
  );
}
