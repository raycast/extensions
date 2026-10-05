import { Action, ActionPanel, Grid, Icon, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readSetting, requireOneko, send } from "./oneko";
import { SKIN_GROUPS, Skin } from "./skins";

export default function Command() {
  const { data: current } = useCachedPromise(async () => (await readSetting("spriteVariant")) ?? "cat");

  async function choose(skin: Skin) {
    if (!(await requireOneko())) return;
    if (!(await send(`skin/${skin.value}`))) return;
    await showHUD(`Skin: ${skin.title}`);
  }

  return (
    <Grid searchBarPlaceholder="Search skins…" inset={Grid.Inset.Medium} columns={7}>
      <Grid.EmptyView icon={Icon.Image} title="No Matching Skins" description="Try a different name." />
      {SKIN_GROUPS.map((group) => (
        <Grid.Section key={group.name} title={group.name}>
          {group.skins.map((skin) => (
            <Grid.Item
              key={skin.value}
              content={`skins/${skin.value}.png`}
              title={skin.title}
              keywords={[skin.value]}
              subtitle={skin.value === current ? "Current" : undefined}
              actions={
                <ActionPanel>
                  <Action icon={Icon.Checkmark} title="Use Skin" onAction={() => choose(skin)} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
