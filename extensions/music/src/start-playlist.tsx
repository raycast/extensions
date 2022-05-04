import { useCallback, useEffect, useState } from "react";
import * as E from 'fp-ts/Either'
import { Action, ActionPanel, closeMainWindow, List, showToast, Toast, ToastStyle, useNavigation } from "@raycast/api";
import { Playlist } from "./util/models";
import { parseResult } from "./util/parser";
import * as music from "./util/scripts";
import { flow, pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither'
import { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray';

export default function PlaySelected() {
  const [playlists, setPlaylists] = useState<ReadonlyArray<Playlist> | null>( null );
  const { pop } = useNavigation();

  useEffect( () => {
    pipe(
      music.playlists.getPlaylists,
      TE.mapLeft( _ => showToast( Toast.Style.Failure, "Could not get your playlists" ) ),
      TE.map( flow(
        parseResult<Playlist>(),
        setPlaylists
      ) ),
    )()
  }, [] );

  return (
    <List isLoading={playlists === null} searchBarPlaceholder="Search A Playlist">
      {playlists &&
        playlists?.length > 0 &&
        playlists.map( ( { id, name, duration, count } ) => (
          <List.Item
            key={id}
            title={name}
            accessoryTitle={`🎧 ${count}  ⏱ ${Math.floor( Number( duration ) / 60 )} min`}
            icon={{ source: "../assets/icon.png" }}
            actions={<Actions name={name} pop={pop} />}
          />
        ) )}
    </List>
  );
}

interface ActionsProps {
  name: string
  pop(): void
}

function Actions( { name, pop }: ActionsProps ) {
  const title = `Start Playlist "${name}"`;

  const handleSubmit = useCallback( async () => {
    const play = await music.playlists.play( name )();

    if ( E.isLeft( play ) ) {
      await showToast( Toast.Style.Failure, "Could not play this playlist" );
      return;
    }

    await closeMainWindow();
    pop();
  }, [pop] );

  return (
    <ActionPanel title={title}>
      <Action title={title} onAction={handleSubmit} />
    </ActionPanel>
  );
}
