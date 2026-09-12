import { List, LaunchProps } from "@raycast/api";
import { getDnd } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import SpellDetail from "./templates/spellDetail";
import Unresponsive from "./templates/unresponsive";
// import { useState } from "react";

interface spellsType {
  isLoading: boolean;
  data: indexCollection;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Spells }>) {
  const { level, school } = props.arguments;
  let apiUrl = `/api/spells`;

  if (level) {
    apiUrl += `?level=${level}`;
    if (school) {
      apiUrl += `&school=${school}`;
    }
  } else if (school) {
    apiUrl += `?school=${school}`;
  }

  const spells = getDnd(apiUrl) as spellsType;
  // const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null); // todo: come back and develop Favorites system

  if (!spells?.data && spells.isLoading) {
    return <List isLoading={true} />;
  }

  if (!spells?.data) {
    return <Unresponsive />;
  }

  return (
    <List
      throttle={true}
      filtering={true}
      isLoading={spells.isLoading}
      searchBarPlaceholder={`Searching ${spells.data.results.length} spells...`}
      isShowingDetail
    >
      {spells?.data.results?.map((spell: index) => (
        <List.Item
          id={spell.index}
          key={spell.index}
          title={spell.name}
          accessories={[{ text: `Level: ${spell.level}` }]}
          detail={<SpellDetail name={spell.name} url={spell.url} index={spell.url} />}
        />
      ))}
    </List>
  );
}
