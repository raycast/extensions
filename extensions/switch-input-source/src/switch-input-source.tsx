import {
  ActionPanel,
  Action,
  List,
  showHUD,
  showToast,
  Toast,
  environment,
} from "@raycast/api";
import { execFileSync } from "child_process";
import { useEffect, useState } from "react";
import path from "path";
import {
  displayName,
  isKeyboardSource,
  parseSources,
  searchTerms,
} from "./sources";
import type { InputSource } from "./sources";

// In `ray dev`, __dirname is inside the extension's src/ directory.
// In the built extension, the binary lives next to the compiled JS in dist/.
// We resolve relative to the package root either way.
const HELPER_PATH = path.resolve(
  environment.assetsPath,
  "..",
  "build",
  "InputSourceHelper",
);

function switchSource(source: InputSource): void {
  execFileSync(HELPER_PATH, ["switch", source.id]);
  showHUD(`Switched to ${displayName(source)}`);
}

export default function Command() {
  const [sources, setSources] = useState<InputSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const output = execFileSync(HELPER_PATH, ["list"], { encoding: "utf8" });
      setSources(parseSources(output).filter(isKeyboardSource));
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load input sources",
        message: String(e),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a layout name — English, Russian, Pinyin…"
    >
      {sources.map((source) => (
        <List.Item
          key={source.id}
          title={displayName(source)}
          subtitle={
            source.name !== displayName(source) ? source.name : undefined
          }
          keywords={searchTerms(source)}
          actions={
            <ActionPanel>
              <Action
                title="Switch to This Layout"
                onAction={() => switchSource(source)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
