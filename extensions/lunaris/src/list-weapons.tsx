import { useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { getAllWeapons } from "@/lib/utils/lunaris";
import { RARITY, RARITY_COLORS_RAYCAST, WEAPON_TYPE } from "@/lib/constants";

import WeaponDetail from "@/components/weapon/weapon-detail";
import WeaponAscensionMaterials from "@/components/weapon/weapon-ascension-mats";

export default function Command() {
  const { isLoading, data: weapons } = useCachedPromise(getAllWeapons);
  const preferences = getPreferenceValues<Preferences>();
  const [pinned, setPinned] = useCachedState<string[]>("pinned_weapons", []);
  const [filter, setFilter] = useState<string>("All");
  const [refinementLevel, setRefinementLevel] = useState(1);

  const changeRefinementLevel = (add = false) => {
    setRefinementLevel((prev) => (add ? Math.min(5, prev + 1) : Math.max(1, prev - 1)));
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Weapons" onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
          <List.Dropdown.Section title="Weapons">
            {Object.keys(WEAPON_TYPE).map((type) => {
              const key = type as keyof typeof WEAPON_TYPE;
              return <List.Dropdown.Item key={key} title={WEAPON_TYPE[key]} value={key} icon={`weapons/${type}.png`} />;
            })}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Rarity">
            {["QUALITY_ORANGE", "QUALITY_PURPLE", "QUALITY_BLUE", "QUALITY_GREEN"].map((type) => {
              return <List.Dropdown.Item key={type} title={`${RARITY[type as keyof typeof RARITY]}★`} value={type} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section title="Pinned Weapons">
        {weapons &&
          Object.entries(weapons)
            .reverse()
            .filter(([id]) => {
              return pinned.includes(id);
            })
            .map(([id, weap]) => (
              <WeaponListItem
                key={id}
                id={id}
                weapon={weap}
                pinned={pinned}
                setPinned={setPinned}
                refinementLevel={refinementLevel}
                changeRefinementLevel={changeRefinementLevel}
              />
            ))}
      </List.Section>
      <List.Section title={pinned && pinned.length > 0 ? "All Weapons" : undefined}>
        {weapons &&
          Object.entries(weapons)
            .reverse()
            .filter(([id, weap]) => {
              const releaseTimeMs = weap.releaseDate * 1000;
              const isAllowed = preferences.allowUnreleased || releaseTimeMs <= Date.now();
              const matchesFilter =
                !filter || filter === "All" || weap.weaponType === filter || weap.qualityType === filter;
              return isAllowed && matchesFilter && !pinned.includes(id);
            })
            .map(([id, weap]) => (
              <WeaponListItem
                key={id}
                id={id}
                weapon={weap}
                pinned={pinned}
                setPinned={setPinned}
                refinementLevel={refinementLevel}
                changeRefinementLevel={changeRefinementLevel}
              />
            ))}
      </List.Section>
    </List>
  );
}

type WeaponListItemProps = {
  id: string;
  weapon: GenshinWeapon;
  pinned: string[];
  setPinned: React.Dispatch<React.SetStateAction<string[]>>;
  refinementLevel: number;
  changeRefinementLevel: (add?: boolean) => void;
};

function WeaponListItem({
  id,
  weapon,
  pinned,
  setPinned,
  refinementLevel,
  changeRefinementLevel,
}: WeaponListItemProps) {
  return (
    <List.Item
      detail={<WeaponDetail id={id} weapon={weapon} refinementLevel={refinementLevel} />}
      title={weapon.enName}
      accessories={[
        {
          text: {
            value: `${RARITY[weapon.qualityType]}★`,
            color: RARITY_COLORS_RAYCAST[weapon.qualityType],
          },
        },
      ]}
      icon={{
        source: `https://api.lunaris.moe/data/assets/weaponicon/${weapon.weaponIcon}.webp`,
      }}
      actions={
        <ActionPanel>
          <Action.Push
            target={<WeaponAscensionMaterials id={id} />}
            title="Ascension Materials"
            icon={Icon.PlusSquare}
          />
          <Action
            title={pinned.includes(id) ? "Unpin Weapon" : "Pin Weapon"}
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
          {refinementLevel < 5 && (
            <Action
              title="Increase Refinement"
              icon={Icon.ArrowUp}
              onAction={() => changeRefinementLevel(true)}
              shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
            />
          )}
          {refinementLevel > 1 && (
            <Action
              title="Decrease Refinement"
              icon={Icon.ArrowDown}
              onAction={() => changeRefinementLevel()}
              shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
            />
          )}
          <Action.OpenInBrowser url={`https://lunaris.moe/weapon/${id}`} />
        </ActionPanel>
      }
    />
  );
}
