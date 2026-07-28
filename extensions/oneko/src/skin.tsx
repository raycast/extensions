import { Action, ActionPanel, Grid, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { readSetting, requireOneko, send } from "./oneko";
import { SKIN_GROUPS, Skin } from "./skins";

export default function Command() {
  const [current, setCurrent] = useState<string>();

  useEffect(() => {
    readSetting("spriteVariant").then((value) => setCurrent(value ?? "cat"));
  }, []);

  async function choose(skin: Skin) {
    if (!(await requireOneko())) return;
    await send(`skin/${skin.value}`);
    await showHUD(`Skin: ${skin.title}`);
  }

  return (
    <Grid inset={Grid.Inset.Medium} columns={7}>
      {SKIN_GROUPS.map((group) => (
        <Grid.Section key={group.name} title={group.name}>
          {group.skins.map((skin) => (
            <Grid.Item
              key={skin.value}
              content={`skins/${skin.value}.png`}
              title={skin.title}
              subtitle={skin.value === current ? "Current" : undefined}
              actions={
                <ActionPanel>
                  <Action title="Use Skin" onAction={() => choose(skin)} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
