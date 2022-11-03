import { ActionPanel, Action, Grid, Detail, environment, Image, Icon } from "@raycast/api";
import { join } from "path";

const eases = [
  "Unset",
  "Linear",
  "InSine",
  "OutSine",
  "InOutSine",
  "InQuad",
  "OutQuad",
  "InOutQuad",
  "InCubic",
  "OutCubic",
  "InOutCubic",
  "InQuart",
  "OutQuart",
  "InOutQuart",
  "InQuint",
  "OutQuint",
  "InOutQuint",
  "InExpo",
  "OutExpo",
  "InOutExpo",
  "InCirc",
  "OutCirc",
  "InOutCirc",
  "InElastic",
  "OutElastic",
  "InOutElastic",
  "InBack",
  "OutBack",
  "InOutback",
  "InBounce",
  "OutBounce",
  "InOutBounce",
  "Flash",
  "InFlash",
  "OutFlash",
  "InOutFlash",
  "INTERNAL_Zero",
];

export default function Command() {
  return (
    <Grid itemSize={Grid.ItemSize.Large}>
      {eases.map((ease) => {
        const copyAction = <Action.CopyToClipboard content={`Ease.${ease}`} />;
        return (
          <Grid.Item
            key={ease}
            content={{ source: `${join("grid", ease)}.gif` }}
            title={ease}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.MagnifyingGlass}
                  title="View"
                  target={
                    <Detail
                      markdown={`![](file://${join(environment.assetsPath, "full", ease)}.gif)`}
                      actions={<ActionPanel>{copyAction}</ActionPanel>}
                    />
                  }
                />
                {copyAction}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
