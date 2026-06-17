import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
  useNavigation,
  ArgumentsLaunchProps,
} from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { Preferences } from "./util/models";
import { divideNumber } from "./util/parser";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";
import { hud } from "./util/feedback";

export default function SetVolume(props: ArgumentsLaunchProps) {
  const { volumeSteps = "10" } = getPreferenceValues<Preferences>();
  const step = parseInt(volumeSteps);

  const volumeArg = props.arguments?.volumeArg;

  const volumeLevels = divideNumber(100, step);

  const [volume, setVolume] = useState<number | null>(null);

  // on view load
  // update local state with current volume
  useEffect(() => {
    pipe(
      music.player.volume.get,
      handleTaskEitherError((error) => error, setVolume),
    )();
  }, []);

  // if volume arg is passed we can close the view
  useEffect(() => {
    if (!volumeArg || isNaN(parseInt(volumeArg))) return;

    pipe(
      music.player.volume.set(parseInt(volumeArg)),
      handleTaskEitherError("Could not update volume", () => {
        hud(`Volume set to ${volumeArg}`);
        popToRoot();
        closeMainWindow();
      }),
    )();
  }, [volumeArg]);

  return (
    <List isLoading={!volume || (volumeArg && !isNaN(parseInt(volumeArg)))}>
      {!volumeArg &&
        volumeLevels.map((level) => (
          <List.Item
            key={level}
            title={level.toString()}
            icon={volume === level ? Icon.CheckCircle : Icon.SpeakerOn}
            actions={<Actions value={level} />}
          />
        ))}
    </List>
  );
}

function Actions({ value }: { value: number }) {
  const { pop } = useNavigation();
  const title = "Set Volume";

  const handleRating = async () => {
    await pipe(
      music.player.volume.set(value),
      TE.mapLeft((error) => {
        console.error(error);
        showToast(Toast.Style.Failure, "Could not update volume");
      }),
      TE.map(() => {
        hud(`Volume set to ${value}`);
        closeMainWindow();
      }),
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title={title} onAction={handleRating} icon={Icon.SpeakerOn} />
    </ActionPanel>
  );
}
