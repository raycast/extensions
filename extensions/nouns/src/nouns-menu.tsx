import { getPreferenceValues, Image, MenuBarExtra } from "@raycast/api";
import { Noun, togglePinnedNoun } from "./storage";
import { useCachedState } from "@raycast/utils";

const iconShapes = {
  circle: Image.Mask.Circle,
  rounded: Image.Mask.RoundedRectangle,
};

export default function Command() {
  const { iconShape } = getPreferenceValues();
  const [pinnedNouns, setPinnedNouns] = useCachedState<Noun[]>("pinned-nouns", []);
  const activeNoun = pinnedNouns.filter((noun) => noun.active)[0];

  return (
    <MenuBarExtra
      isLoading={false}
      icon={{
        source: activeNoun ? `https://noun.pics/${activeNoun.id}` : "nouns-icon.png",
        mask: iconShapes[iconShape as keyof typeof iconShapes],
      }}
    >
      {pinnedNouns.length === 0 && <MenuBarExtra.Item title="Add Nouns from the Search View." />}
      {pinnedNouns.map((noun) => {
        const isCurrentlyActive = activeNoun?.id === noun.id;
        return (
          <MenuBarExtra.Item
            key={noun.id}
            icon={{
              source: `https://noun.pics/${noun.id}`,
              mask: iconShapes[iconShape as keyof typeof iconShapes],
            }}
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
  );
}
