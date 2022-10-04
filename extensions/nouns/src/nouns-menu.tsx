import { useState, useEffect } from "react";
import { MenuBarExtra } from "@raycast/api";
import { getNounsFromStorage } from "./storage";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [pinnedNouns] = useCachedState<string[]>("pinned-nouns", []);
  const [activeNoun, setActiveNoun] = useState<string>(pinnedNouns[0]);
  console.log("pinnedNouns", pinnedNouns);
  console.log("pinnedNouns", pinnedNouns);

  return pinnedNouns ? (
    <MenuBarExtra isLoading={false} icon={`https://noun.pics/${activeNoun}`}>
      {pinnedNouns.map((nounId) => (
        <MenuBarExtra.Item
          key={nounId}
          icon={`https://noun.pics/${nounId}`}
          title={`#${nounId} ${nounId === activeNoun ? "(active)" : ""}`}
          onAction={() => setActiveNoun(nounId)}
        />
      ))}
    </MenuBarExtra>
  ) : null;
}
