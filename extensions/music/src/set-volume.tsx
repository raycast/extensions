import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { SFSymbols } from "./util/models";
import * as music from "./util/scripts";
import { handleTaskEitherError } from "./util/utils";

const volumeLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function SetVolume() {
  const [volume, setVolume] = useState<number | null>(null);

  useEffect(() => {
    pipe(
      music.player.volume.get,
      handleTaskEitherError((error) => error, setVolume)
    )();
  }, []);

  return (
    <List isLoading={!volume}>
      {volumeLevels.map((level) => (
        <List.Item
          key={level}
          title={level.toString()}
          icon={volume === level ? Icon.Checkmark : Icon.SpeakerOn}
          actions={<Actions value={level} />}
        />
      ))}
    </List>
  );
}

function Actions({ value }: { value: number }) {
  const { pop } = useNavigation();
  const title = SFSymbols.SPEAKER_FILL + "  Set Volume";

  const handleRating = async () => {
    await pipe(
      music.player.volume.set(value),
      TE.mapLeft((error) => {
        console.error(error);
        showToast(Toast.Style.Failure, "Could not update volume");
      }),
      TE.map(() => {
        showHUD(`Volume set to ${value}`);
        closeMainWindow();
      })
    )();

    pop();
  };

  return (
    <ActionPanel>
      <Action title={title} onAction={handleRating} />
    </ActionPanel>
  );
}
