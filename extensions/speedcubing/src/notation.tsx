import { ActionPanel, Action, Grid } from "@raycast/api";
import { notation } from "./data";

export default function Notation() {
  return (
    <Grid inset={Grid.Inset.Small} columns={6}>
      {notation.map(({ title, notations }) => (
        <Grid.Section title={title} key={title}>
          {notations.map((n) => {
            const title = n.replace("-", " / ");
            return (
              <Grid.Item
                key={n}
                title={title}
                content={`notation/${n}.png`}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={title} title="Copy Notation" />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}
