import { ActionPanel, Action, Grid, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { EmojiWithUnicode } from "./types";
import { CATEGORY_ORDER } from "./constants";
import { loadEmojiIndex, loadCombinations, getGStaticUrl } from "./utils";
import { ResultView } from "./components/ResultView";
import { MashupGrid } from "./components/MashupGrid";

export default function Command() {
  const { push } = useNavigation();
  const [selectedEmoji1, setSelectedEmoji1] = useState<string | null>(null);
  const [mode, setMode] = useState<"combine" | "explore">("explore");

  const { data: index, isLoading } = useCachedPromise(async () => {
    return loadEmojiIndex();
  });

  const emojiList = useMemo(() => {
    if (!index) return [];
    return Object.entries(index).map(([u, info]) => ({
      unicode: u,
      ...info,
    }));
  }, [index]);

  const categories = useMemo(() => {
    if (!index) return [];
    const cats: Record<string, typeof emojiList> = {};
    emojiList.forEach((item) => {
      const cat = item.c || "other";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(item);
    });

    return Object.entries(cats).sort(([a], [b]) => {
      const indexA = CATEGORY_ORDER.indexOf(a.toLowerCase());
      const indexB = CATEGORY_ORDER.indexOf(b.toLowerCase());
      
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    }).map(([cat, items]) => {
      return [cat, items.sort((a, b) => a.o - b.o)] as const;
    });
  }, [emojiList, index]);

  const handleSelectEmoji = (item: EmojiWithUnicode) => {
    if (!index) return;
    
    if (mode === "explore") {
      push(<MashupGrid baseEmoji={item} index={index} />);
    } else {
      if (!selectedEmoji1) {
        setSelectedEmoji1(item.unicode);
        showToast({
          title: `Selected ${item.e}`,
          message: "Now select another emoji to combine",
          style: Toast.Style.Animated,
        });
      } else {
        const emoji1Combs = loadCombinations(selectedEmoji1);
        const comboStr = emoji1Combs[item.unicode];
        
        if (comboStr) {
          const [date, left] = comboStr.split("/");
          const right = left === item.unicode ? selectedEmoji1 : item.unicode;
          const url = getGStaticUrl(left, right, date);
          
          push(
            <ResultView 
              url={url} 
              e1={index[selectedEmoji1].e} 
              e2={item.e} 
              onReset={() => setSelectedEmoji1(null)} 
            />
          );
        } else {
          showToast({
            title: "No combination found",
            message: `Sorry, ${index[selectedEmoji1].e} and ${item.e} can't be combined yet.`,
            style: Toast.Style.Failure,
          });
          setSelectedEmoji1(null);
        }
      }
    }
  };

  const handleRandomize = () => {
    if (!index) return;
    const keys = Object.keys(index);
    const randomKey1 = keys[Math.floor(Math.random() * keys.length)];
    const emoji1Combs = loadCombinations(randomKey1);
    const combKeys = Object.keys(emoji1Combs);
    if (combKeys.length === 0) return handleRandomize();
    const randomKey2 = combKeys[Math.floor(Math.random() * combKeys.length)];
    const comboStr = emoji1Combs[randomKey2];
    
    const [date, left] = comboStr.split("/");
    const right = left === randomKey2 ? randomKey1 : randomKey2;
    const url = getGStaticUrl(left, right, date);
    
    push(
      <ResultView 
        url={url} 
        e1={index[randomKey1].e} 
        e2={index[randomKey2].e} 
        onReset={() => setSelectedEmoji1(null)} 
      />
    );
  };

  return (
    <Grid
      columns={8}
      isLoading={isLoading}
      inset={Grid.Inset.Small}
      searchBarPlaceholder={
        selectedEmoji1 && index
          ? `Combining ${index[selectedEmoji1].e} with...` 
          : "Search emoji to cook..."
      }
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Mode"
          storeValue={true}
          onChange={(newValue) => {
            setMode(newValue as "combine" | "explore");
            setSelectedEmoji1(null);
          }}
        >
          <Grid.Dropdown.Item title="Explore Mashups" value="explore" icon={Icon.MagnifyingGlass} />
          <Grid.Dropdown.Item title="Combine Emojis" value="combine" icon={Icon.PlusCircle} />
        </Grid.Dropdown>
      }
    >
      {selectedEmoji1 && index && (
        <Grid.Section title="Current Selection">
           <Grid.Item
            key="selected"
            content={index[selectedEmoji1].e}
            title="Selected"
            actions={
              <ActionPanel>
                <Action title="Clear Selection" onAction={() => setSelectedEmoji1(null)} icon={Icon.XMarkCircle} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}

      {categories.map(([cat, items]) => (
        <Grid.Section key={cat} title={cat.toUpperCase()}>
          {items.map((item) => (
            <Grid.Item
              key={item.unicode}
              content={item.e}
              title={item.a}
              actions={
                <ActionPanel>
                  <Action title={mode === "combine" ? "Combine" : "Explore"} onAction={() => handleSelectEmoji(item)} />
                  <Action title="Randomize" onAction={handleRandomize} icon={Icon.Wand} shortcut={{ modifiers: ["cmd"], key: "r" }} />
                  {selectedEmoji1 && (
                    <Action title="Clear Selection" onAction={() => setSelectedEmoji1(null)} icon={Icon.XMarkCircle} />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
