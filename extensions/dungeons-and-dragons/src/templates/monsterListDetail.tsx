import { List, Color } from "@raycast/api";
import { getDnd } from "../utils/dndData";
import { index, monster } from "../utils/types";

interface monsterType {
  isLoading: boolean;
  data: monster;
}

export default function MonsterListDetail(monster: index) {
  const foe = getDnd(monster.url) as monsterType;

  if (foe.data) {
    let foeMarkdown = `# ${foe.data.name}\n`;
    if (foe.data.image) {
      foeMarkdown += `![Illustration](https://www.dnd5eapi.co${foe.data.image})\n`;
    }
    return (
      <List.Item
        title={foe.data.name}
        accessories={[{ tag: { value: foe.data.type.toString(), color: Color.Magenta } }]}
        detail={<List.Item.Detail markdown={foeMarkdown} />}
      />
    );
  }
}
