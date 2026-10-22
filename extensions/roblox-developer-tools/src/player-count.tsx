import {
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchPlayerCount } from "./player-count-utils";
import { settings } from "./utils";

type State = {
  loading: boolean;
  game?: Awaited<ReturnType<typeof fetchPlayerCount>>;
  error?: string;
};

export default function Command() {
  const { hideZeroPlayers } = getPreferenceValues<Preferences.PlayerCount>();
  const [state, setState] = useState<State>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const { universeId } = settings("universeId");
        const game = await fetchPlayerCount(universeId);
        if (!cancelled) setState({ loading: false, game });
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load player count.",
          });
        }
      }
    }
    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the command alive while fetching, without flashing an icon when hidden.
  if (state.loading) return <MenuBarExtra isLoading />;
  if (hideZeroPlayers && state.game?.playing === 0) {
    return null;
  }

  const count = state.game?.playing.toLocaleString();
  return (
    <MenuBarExtra
      icon={state.error ? Icon.ExclamationMark : Icon.TwoPeople}
      title={count ?? "—"}
      tooltip={state.error ?? `${state.game?.name}: ${count} players online`}
    >
      <MenuBarExtra.Item title={state.game?.name ?? "Player Count"} />
      <MenuBarExtra.Item title={state.error ?? `${count} players online`} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Open Settings"
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
