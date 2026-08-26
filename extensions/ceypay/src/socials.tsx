import { Action, ActionPanel, Grid } from "@raycast/api";
import { SOCIALS } from "./lib/socials";

/**
 * A top-level command rather than a section inside the docs: following CeyPay is
 * its own errand, and burying it under a docs search made it reachable only by
 * knowing to look there.
 */
export default function Socials() {
  return (
    // One column per channel keeps them on a single row without oversizing the
    // cards; Raycast allows up to eight.
    <Grid
      columns={SOCIALS.length}
      inset={Grid.Inset.Medium}
      navigationTitle="Follow CeyPay"
      searchBarPlaceholder="Find a channel…"
    >
      <Grid.Section title="CeyPay Channels">
        {SOCIALS.map((social) => (
          <Grid.Item
            key={social.name}
            content={{ value: social.icon, tooltip: social.url }}
            title={social.name}
            subtitle={social.handle}
            keywords={["social", "follow", social.name.toLowerCase()]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title={`Open ${social.name}`} url={social.url} />
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={social.url}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
