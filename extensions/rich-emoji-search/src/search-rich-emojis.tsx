import { useState } from "react";
import { ActionPanel, Action, Color, Grid, Keyboard } from "@raycast/api";
import { richEmojis } from "./rich-emoji";

export default function Command() {
  const [columns, setColumns] = useState(5);

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Small}
      searchBarPlaceholder="Search rich emojis…"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          defaultValue="5"
          onChange={(newValue) => setColumns(parseInt(newValue, 10))}
        >
          <Grid.Dropdown.Item title="Large" value="3" />
          <Grid.Dropdown.Item title="Medium" value="5" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      {richEmojis.map((emoji) => (
        <Grid.Item
          key={emoji.name}
          content={{
            // Text-presentation characters get an SVG so the tile shows the
            // glyph a terminal draws, not the colour emoji Raycast would
            // substitute. Everything else is already drawn correctly.
            value: emoji.terminalPreview
              ? { source: emoji.terminalPreview, tintColor: Color.PrimaryText }
              : emoji.display,
            tooltip: emoji.markup,
          }}
          title={emoji.name}
          subtitle={emoji.aliases.length > 0 ? `also :${emoji.aliases.join(": :")}:` : undefined}
          keywords={emoji.keywords}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste title="Paste Emoji" content={emoji.display} />
                <Action.CopyToClipboard title="Copy Emoji" content={emoji.display} />
                {/*
                  Only worth offering where rich's stored character differs from
                  what actually renders — 254 of 3608 entries. Elsewhere it would
                  be a duplicate of Paste Emoji.
                */}
                {emoji.needsPresentationSelector && (
                  <Action.Paste
                    title="Paste Exact Character"
                    content={emoji.character}
                    shortcut={{
                      macOS: { modifiers: ["opt"], key: "enter" },
                      Windows: { modifiers: ["alt"], key: "enter" },
                    }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Rich Markup">
                <Action.Paste
                  title="Paste Rich Markup"
                  content={emoji.markup}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "enter" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Rich Markup"
                  content={emoji.markup}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={emoji.name}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
