import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMaterials } from "@/lib/utils/lunaris";
import { sanitizeDescription } from "@/lib/utils/format";

type Props = { character: GenshinCharacterSingle };

export default function CharacterAscensionMaterials({ character }: Props) {
  const { isLoading, data: materials } = usePromise(getMaterials);

  const sections = [
    {
      title: "Character Ascension (Lv. 90)",
      items: [
        { label: "Experience", data: character.ascension.exp },
        { label: "Local Speciality", data: character.ascension.speciality },
        { label: "Elemental Stone", data: character.ascension.elemental },
        { label: "Common Enemies", data: character.ascension.worldmonster },
        { label: "Boss Material", data: character.ascension.elitemonster },
      ],
    },
    {
      title: "Skill Upgrades (Lv. 10)",
      items: [
        { label: "Crown", data: character.skills.leveling.crown },
        { label: "Books", data: character.skills.leveling.books },
        {
          label: "Common Enemies",
          data: character.skills.leveling.worldmonster,
        },
        {
          label: "Weekly Boss Materials",
          data: character.skills.leveling.weekly,
        },
      ],
    },
  ];

  return (
    <List isLoading={isLoading} navigationTitle={`${character.info.name} / Materials`} isShowingDetail>
      <MaterialItem
        id="202"
        amount={Number(character.ascension["202"])}
        item={
          {
            enName: "Mora",
            enDescription: "Common currency. The one language everybody speaks.",
            icon: "UI_ItemIcon_202",
          } as MaterialItemData
        }
      />

      {sections.map((group) => (
        <List.Section key={group.title} title={group.title}>
          {group.items.flatMap((section) =>
            Object.entries(section.data).map(([id, amount]) => (
              <MaterialItem key={id} id={id} amount={amount} item={materials?.[id]} />
            )),
          )}
        </List.Section>
      ))}
    </List>
  );
}

function MaterialItem({ id, amount, item }: { id: string; amount: number; item?: MaterialItemData }) {
  const iconUrl = item?.icon ? `https://api.lunaris.moe/data/assets/items/${item.icon}.webp` : "";
  const cleanDescription = sanitizeDescription(item?.enDescription || "");

  return (
    <List.Item
      title={item?.enName || `ID: ${id}`}
      subtitle={`x${amount.toLocaleString("en-US")}`}
      keywords={[id]}
      icon={{ source: iconUrl }}
      detail={
        <List.Item.Detail
          markdown={`
${iconUrl && `![](${iconUrl})`}
# ${item?.enName || "Unknown Item"} (x${amount.toLocaleString("en-US")})
${cleanDescription}
          `}
        />
      }
    />
  );
}
