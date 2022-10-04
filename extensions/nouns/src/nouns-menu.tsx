import { getPreferenceValues, MenuBarExtra } from "@raycast/api";
import { Noun, togglePinnedNoun } from "./storage";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const { enableMenuBar } = getPreferenceValues();
  const [pinnedNouns, setPinnedNouns] = useCachedState<Noun[]>("pinned-nouns", []);
  const activeNoun = pinnedNouns.filter((noun) => noun.active)[0];

  return enableMenuBar ? (
    <MenuBarExtra isLoading={false} icon={activeNoun ? `https://noun.pics/${activeNoun.id}` : "nouns-icon.png"}>
      {pinnedNouns.length === 0 && <MenuBarExtra.Item title="Add Nouns from the Search View." />}
      {pinnedNouns.map((noun) => {
        const isCurrentlyActive = activeNoun?.id === noun.id;
        return (
          <MenuBarExtra.Item
            key={noun.id}
            icon={`https://noun.pics/${noun.id}`}
            title={`Noun #${noun.id}`}
            onAction={
              isCurrentlyActive
                ? undefined
                : async () => {
                    const pinnedNouns = await togglePinnedNoun(noun.id);
                    setPinnedNouns(pinnedNouns);
                  }
            }
          />
        );
      })}
    </MenuBarExtra>
  ) : null;
}
