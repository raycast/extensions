import { runTidalCommand, getNowPlaying } from "./util/fn";
import { MenuBarExtra, open } from "@raycast/api";
import { useEffect, useState } from "react";

import doPause from "./pause";
import doNextSong from "./next-song";
import doPrevSong from "./prev-song";
import doShuffle from "./shuffle";

export default function nowPlayingMenuBar() {
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [fullNowPlaying, setFullNowPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function loadNowPlaying() {
      setIsLoading(true);
      await runTidalCommand(
        async () => {
          const { full, formatted, short } = await getNowPlaying();
          setNowPlaying(short);
          setFullNowPlaying(formatted);
          setIsLoading(false);
          console.log(full);
        },
        { silent: true }, //passing a silent flag for when Tidal is not running
      );
      setIsLoading(false);
    }
    loadNowPlaying();
  }, []);

  const tidalIcon = {
    source: { light: "icons/tidal-logo-light.svg", dark: "icons/tidal-logo-dark.svg" },
  };

  const menuItems: JSX.Element = (
    <MenuBarExtra
      icon={tidalIcon}
      title={nowPlaying !== null && nowPlaying !== "TIDAL" ? (nowPlaying as string) : undefined}
      isLoading={isLoading}
      tooltip={
        fullNowPlaying !== null && nowPlaying !== "TIDAL"
          ? (nowPlaying as string)
          : "Tidal must be minimized, hidden or open to show Now Playing information"
      }
    >
      {nowPlaying !== null && nowPlaying !== "TIDAL" ? (
        <MenuBarExtra.Section title={fullNowPlaying as string}>
          {[
            { icon: "⏸️", title: "Pause", action: doPause },
            { icon: "⏩", title: "Next Song", action: doNextSong },
            { icon: "⏪", title: "Previous Song", action: doPrevSong },
            { icon: "🔀", title: "Shuffle", action: doShuffle },
          ].map(({ icon, title, action }) => (
            <MenuBarExtra.Item
              icon={icon}
              key={title}
              title={title}
              onAction={async () => {
                await action();
              }}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={"Open Tidal"} onAction={() => open("/Applications/Tidal.app")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );

  return <>{menuItems}</>;
}
