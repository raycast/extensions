import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getGameVersion, getMaterials } from "@/lib/utils/lunaris";

type Props = { id: string };

export default function WeaponAscensionMaterials({ id }: Props) {
  const { isLoading: loadingWeapon, data: weapon } = usePromise(async () => {
    const gameVersion = await getGameVersion();
    if (!gameVersion) return undefined;

    const res = await fetch(`https://api.lunaris.moe/data/${gameVersion}/en/weapon/${id}.json`);
    if (!res.ok) return undefined;
    const characterData = (await res.json()) as GenshinWeaponDetail;
    return characterData;
  });

  const { isLoading, data: materials } = usePromise(getMaterials);

  if (!weapon) return;

  const materialList = weapon.ascension.map(({ count, icon }) => {
    const materialID = icon.split("_").at(-1);
    if (!materials || !materialID || isNaN(Number(materialID)) || !materials[materialID])
      return {
        id: "-1",
        name: "???",
        description: "???",
        amount: 0,
        icon: "",
      };

    return {
      id: materialID,
      name: materials[materialID].enName,
      description: materials[materialID].enDescription,
      amount: count,
      icon: `https://api.lunaris.moe/data/assets/items/${icon}.webp`,
    };
  });

  return (
    <List isLoading={isLoading || loadingWeapon} navigationTitle={`${weapon.name} / Materials`} isShowingDetail>
      {materialList.map(
        (item, index) =>
          item && (
            <List.Item
              key={item.id === "-1" ? index : item.id}
              title={item.name || `ID: ${item.id}`}
              subtitle={`x${item.amount.toLocaleString()}`}
              keywords={[item.id, item.name]}
              icon={{ source: item.icon }}
              detail={
                <List.Item.Detail
                  markdown={`
![](${item.icon})
# ${item.name || "Unknown Item"} (x${item.amount.toLocaleString()})
${item.description
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}
		  `}
                />
              }
            />
          ),
      )}
    </List>
  );
}
