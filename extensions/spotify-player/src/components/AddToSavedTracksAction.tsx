import { Action, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getErrorMessage } from "../helpers/getError";
import { useYourLibrary } from "../hooks/useYourLibrary";
import { SimplifiedTrackObject } from "../helpers/spotify.api";

type AddToSavedTracksActionProps = {
  track: SimplifiedTrackObject;
};

export function AddToSavedTracksAction({ track }: AddToSavedTracksActionProps) {
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();
  const library = useYourLibrary();
  const trackId = track.id;
  const { data: trackAlreadyLiked, revalidate } = useCachedPromise(
    (id?: string) => library.containsSavedTrack(id),
    [trackId],
    {
      execute: !!trackId,
    },
  );

  return (
    <>
      {trackAlreadyLiked && (
        <Action
          icon={Icon.HeartDisabled}
          title="Dislike"
          onAction={async () => {
            if (closeWindowOnAction) {
              try {
                if (trackId) {
                  await library.removeSavedTrack(trackId);
                }
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
              if (trackId) {
                await library.removeSavedTrack(trackId);
              }
              await revalidate();
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
                await library.addSavedTrack(track);
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
              await library.addSavedTrack(track);
              await revalidate();
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
