import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";

const items = [
  {
    title: "1 Paragraph",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    key: "1",
  },
  {
    title: "2 Paragraphs - HTML",
    text: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p><p>Donec nec justo eget felis facilisis fermentum. Aliquam porttitor mauris sit amet orci. Aenean dignissim pellentesque felis.</p>",
    key: "2",
  },
  {
    title: "3 Paragraphs - HTML",
    text: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p><p>Donec nec justo eget felis facilisis fermentum. Aliquam porttitor mauris sit amet orci. Aenean dignissim pellentesque felis.</p><p>Morbi in sem quis dui placerat ornare. Pellentesque odio nisi, euismod in, pharetra a, ultricies in, diam. Sed arcu. Cras consequat.</p>",
    key: "3",
  },
  {
    title: "Bullets - HTML",
    text: "<ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li><li>Vestibulum auctor dapibus neque.</li><li>Nunc dignissim risus id metus.</li><li>Cras ornare tristique elit.</li></ul>",
    key: "4",
  },
];

export default function Command() {
  return (
    <List searchBarPlaceholder="Choose an option...">
      {items.map((item) => (
        <List.Item
          icon={{ source: Icon.Text }}
          title={item.title}
          key={item.title}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={item.text}
                shortcut={{ modifiers: ["ctrl"], key: item.key as Keyboard.KeyEquivalent }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
