import { ActionPanel, Action, Icon, List, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { convert } from "./lib/conversion";
import { LetterSet } from "./lib/schema";
import {
  serif_bold,
  serif_italic,
  serif_bold_italic,
  sans_serif,
  sans_serif_bold,
  sans_serif_italic,
  sans_serif_bold_italic,
  script,
  script_bold,
  monospace,
  fraktur,
  double_struck,
} from "./lib/sets";

// Style type definition
type Style = {
  name: string;
  letterSet: LetterSet;
  icon: Icon;
};

// Style definitions
const STYLES: Style[] = [
  { name: "Bold", letterSet: serif_bold, icon: Icon.Bold },
  { name: "Italic", letterSet: serif_italic, icon: Icon.Italics },
  { name: "Bold Italic", letterSet: serif_bold_italic, icon: Icon.TextSelection },
  { name: "Script", letterSet: script, icon: Icon.Pencil },
  { name: "Bold Script", letterSet: script_bold, icon: Icon.Pencil },
  { name: "Fraktur", letterSet: fraktur, icon: Icon.Text },
  { name: "Double-struck", letterSet: double_struck, icon: Icon.Racket },
  { name: "Sans-serif", letterSet: sans_serif, icon: Icon.Text },
  { name: "Sans-serif Bold", letterSet: sans_serif_bold, icon: Icon.Text },
  { name: "Sans-serif Italic", letterSet: sans_serif_italic, icon: Icon.Text },
  { name: "Sans-serif Bold Italic", letterSet: sans_serif_bold_italic, icon: Icon.Text },
  { name: "Monospace", letterSet: monospace, icon: Icon.Code },
];

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClipboard = async () => {
      try {
        const text = await Clipboard.readText();
        setSearchText(text ?? "");
      } catch (error) {
        showFailureToast({
          title: "Failed to read clipboard",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
        setSearchText("");
      } finally {
        setIsLoading(false);
      }
    };
    fetchClipboard();
  }, []);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter text to style..."
      navigationTitle="Style Text"
    >
      {!isLoading &&
        STYLES.map((style) => (
          <List.Item
            key={style.name}
            icon={style.icon}
            title={convert(searchText, style.letterSet)}
            subtitle={style.name}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={convert(searchText, style.letterSet)} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
