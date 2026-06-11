import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { getArtifacts } from "@/lib/utils/lunaris";
import { RARITY, RARITY_COLORS_RAYCAST } from "@/lib/constants";
import { useState } from "react";

export default function Command() {
  const { isLoading, data: artifacts } = useCachedPromise(getArtifacts);
  const preferences = getPreferenceValues<Preferences>();
  const [pinned, setPinned] = useCachedState<string[]>("pinned_artifacts", []);
  const [filter, setFilter] = useState<string>("All");

  if (!isLoading && (!artifacts || Object.keys(artifacts).length === 0)) {
    return (
      <List isLoading={false} isShowingDetail>
        <List.EmptyView title="No artifacts" description="Could not load artifacts." />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Artifacts" onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
          <List.Dropdown.Section title="Rarity">
            {["QUALITY_ORANGE", "QUALITY_PURPLE", "QUALITY_BLUE"].map((type) => {
              return <List.Dropdown.Item key={type} title={`${RARITY[type as keyof typeof RARITY]}★`} value={type} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {pinned && pinned.length > 0 && (
        <List.Section title="Pinned Artifacts">
          {artifacts &&
            Object.entries(artifacts)
              .reverse()
              .filter(([id]) => {
                return pinned.includes(id);
              })
              .map(([id, artifact]) => (
                <ArtifactListItem key={id} id={id} artifact={artifact} pinned={pinned} setPinned={setPinned} />
              ))}
        </List.Section>
      )}

      <List.Section title={pinned && pinned.length > 0 ? "All Artifacts" : undefined}>
        {artifacts &&
          Object.entries(artifacts)
            .reverse()
            .filter(([id, artifact]) => {
              const releaseTimeMs = artifact.releaseDate * 1000;
              const isAllowed = preferences.allowUnreleased || releaseTimeMs <= Date.now();
              const matchesFilter = !filter || filter === "All" || artifact.qualityType === filter;
              return isAllowed && matchesFilter && !pinned.includes(id) && artifact.enName.length > 0;
            })
            .map(([id, artifact]) => (
              <ArtifactListItem key={id} id={id} artifact={artifact} pinned={pinned} setPinned={setPinned} />
            ))}
      </List.Section>
    </List>
  );
}

type ArtifactListItemProps = {
  id: string;
  artifact: ArtifactSet;
  pinned: string[];
  setPinned: React.Dispatch<React.SetStateAction<string[]>>;
};

function ArtifactListItem({ id, artifact, pinned, setPinned }: ArtifactListItemProps) {
  return (
    <List.Item
      icon={{
        source: `https://api.lunaris.moe/data/assets/artifacts/${artifact.setIcon}.webp`,
      }}
      title={artifact.enName}
      accessories={[
        {
          text: {
            value: `${RARITY[artifact.qualityType]}★`,
            color: RARITY_COLORS_RAYCAST[artifact.qualityType],
          },
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={`
![](https://api.lunaris.moe/data/assets/artifacts/${artifact.setIcon}.webp)
# ${artifact.enName}
**2pc bonus:** ${artifact.enBonuses["2pc"] ?? "None"}

${artifact.enBonuses["4pc"] ? `**4pc bonus:** ${artifact.enBonuses["4pc"]}` : ""}
					`}
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={pinned.includes(id) ? "Unpin Artifact" : "Pin Artifact"}
            icon={pinned.includes(id) ? Icon.PinDisabled : Icon.Pin}
            style={pinned.includes(id) ? Action.Style.Destructive : Action.Style.Regular}
            onAction={() => {
              setPinned(
                (prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id) // Remove
                    : [...prev, id], // Add
              );
            }}
          />
          <Action.OpenInBrowser url={`https://lunaris.moe/artifact/${id}`} />
        </ActionPanel>
      }
    />
  );
}
