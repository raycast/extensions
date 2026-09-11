import { Detail } from "@raycast/api";

type Props = {
  character: GenshinCharacterSingle;
};

export default function CharacterConstellations({ character }: Props) {
  return (
    <Detail
      navigationTitle={`${character.info.name} / Constellations`}
      markdown={Object.values(character.constellations)
        .map(
          (con, index) => `
![](https://api.lunaris.moe/data/assets/skills/${con.icon}.webp)
# ${con.name} (C${index + 1})
${con.description
  .replace(/<color=[^>]+>(.*?)<\/color>/gi, "**$1**")
  .replace(/\{LINK#[^}]+\}(.*?)\{\/LINK\}/gi, "_$1_")
  .replace(/\\n/g, "\n\n")
  .replace(/<[^>]*>/g, "")
  .trim()}
		`,
        )
        .join("\n")}
    />
  );
}
