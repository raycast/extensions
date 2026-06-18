import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { passwordLength, runSwiss } from "./swiss";
import { NotInstalled, useSwissInstalled } from "./not-installed";

interface Generator {
  id: string;
  title: string;
  subtitle: string;
  args: () => string[];
}

const GENERATORS: Generator[] = [
  { id: "uuid4", title: "UUID v4", subtitle: "Random UUID", args: () => ["uuid", "gen", "--version", "4"] },
  { id: "uuid7", title: "UUID v7", subtitle: "Time-ordered UUID", args: () => ["uuid", "gen", "--version", "7"] },
  {
    id: "password",
    title: "Password",
    subtitle: "Upper · numbers · symbols",
    args: () => [
      "password",
      "generate",
      "--length",
      String(passwordLength()),
      "--include-upper",
      "--include-numeric",
      "--include-symbol",
    ],
  },
  { id: "lorem", title: "Lorem Ipsum", subtitle: "30 words", args: () => ["lorem", "--words", "30"] },
];

export default function Command() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const installed = useSwissInstalled();

  async function regenerate(gen: Generator) {
    try {
      const out = (await runSwiss(gen.args())).replace(/\s+$/, "");
      setValues((prev) => ({ ...prev, [gen.id]: out }));
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to generate ${gen.title}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function regenerateAll() {
    setLoading(true);
    await Promise.all(GENERATORS.map(regenerate));
    setLoading(false);
  }

  useEffect(() => {
    regenerateAll();
  }, []);

  if (installed === false) return <NotInstalled />;

  return (
    <List isLoading={loading}>
      {GENERATORS.map((gen) => {
        const value = values[gen.id] ?? "";
        return (
          <List.Item
            key={gen.id}
            title={gen.title}
            subtitle={gen.subtitle}
            icon={Icon.Wand}
            accessories={[{ text: value }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={value} />
                <Action.Paste title="Paste" content={value} />
                <Action
                  title="Regenerate"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => regenerate(gen)}
                />
                <Action
                  title="Regenerate All"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={regenerateAll}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
