import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { cliCommand, exampleFor, SECTIONS, UTILITIES, type Utility } from "./lib/utilities";
import { readInput, type Input } from "./lib/input";
import { shortcut } from "./lib/shortcuts";
import { ResultView } from "./components/ResultView";
import { OptionsForm } from "./components/OptionsForm";

export default function RunUtility() {
  // Read once, at launch, while the app the user selected text in is still
  // the frontmost one.
  const { data: input, isLoading } = usePromise(readInput);
  const ready: Input = input ?? { text: "", source: "None" };

  const placeholder =
    ready.source === "None"
      ? `Search ${UTILITIES.length} utilities (nothing selected or copied)`
      : `Search ${UTILITIES.length} utilities for the ${ready.source.toLowerCase()} (${ready.text.length.toLocaleString("en-US")} characters)`;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={placeholder}>
      {SECTIONS.map((section) => (
        <List.Section key={section} title={section}>
          {UTILITIES.filter((u) => u.section === section).map((u) => (
            <UtilityItem key={u.id} utility={u} input={ready} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function UtilityItem({ utility: u, input }: { utility: Utility; input: Input }) {
  const example = exampleFor(u.id);
  // A utility with a required option, or one that needs text when there is
  // none, opens the form first instead of running and failing.
  const runsDirectly = u.required.length === 0 && (u.generates || input.text.length > 0);
  const runTitle = u.generates
    ? "Generate"
    : input.source === "Clipboard"
      ? "Run on Clipboard"
      : "Run on Selected Text";

  const run = runsDirectly ? (
    <Action.Push title={runTitle} icon={Icon.Play} target={<ResultView utility={u} input={input} options={{}} />} />
  ) : null;
  const form = (
    <Action.Push
      title={runsDirectly ? "Run with Options" : u.generates ? "Choose Options" : "Enter Input and Options"}
      icon={Icon.Pencil}
      shortcut={runsDirectly ? shortcut("e") : undefined}
      target={<OptionsForm utility={u} input={input} />}
    />
  );

  return (
    <List.Item
      title={u.title}
      subtitle={u.summary}
      keywords={[u.id, ...u.keywords.split(" ")]}
      accessories={u.options.length ? [{ icon: Icon.Gear, tooltip: `${u.options.length} options` }] : []}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {run}
            {form}
            {example ? (
              <Action.Push
                title="Try the Example"
                icon={Icon.Stars}
                shortcut={shortcut("t")}
                target={
                  <ResultView
                    utility={u}
                    input={{ text: example.input, source: "Example" }}
                    options={example.options}
                  />
                }
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open on RedBison" url={u.url} shortcut={shortcut("o")} />
            <Action.CopyToClipboard
              title="Copy CLI Command"
              icon={Icon.Terminal}
              content={cliCommand(u.id)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
