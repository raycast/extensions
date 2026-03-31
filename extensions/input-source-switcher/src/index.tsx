import { ActionPanel, Action, List, showHUD, environment } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";
import { displayName, isKeyboardSource, parseSources, searchTerms } from "./sources";
import type { InputSource } from "./sources";

// In `ray dev`, __dirname is inside the extension's src/ directory.
// In the built extension, the binary lives next to the compiled JS in dist/.
// We resolve relative to the package root either way.
const HELPER_PATH = path.resolve(environment.assetsPath, "..", "build", "InputSourceHelper");

function listSources(): InputSource[] {
  const output = execSync(`"${HELPER_PATH}" list`, { encoding: "utf8" });
  const all = parseSources(output);
  return all.filter(isKeyboardSource);
}

function switchSource(source: InputSource): void {
  execSync(`"${HELPER_PATH}" switch "${source.id}"`);
  showHUD(`Switched to ${displayName(source)}`);
}

export default function Command() {
  const sources = listSources();

  return (
    <List searchBarPlaceholder="Type a layout name — English, Russian, Pinyin…">
      {sources.map((source) => (
        <List.Item
          key={source.id}
          title={displayName(source)}
          subtitle={source.name !== displayName(source) ? source.name : undefined}
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
