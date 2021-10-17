import { ActionPanel, CopyToClipboardAction, Icon, List, render } from "@raycast/api";

type IconItem = [string, Icon];

export default function Command() {
  const iconsList: IconItem[] = [
    ["ArrowClockwise", Icon.ArrowClockwise],
    ["ArrowRight", Icon.ArrowRight],
    ["Binoculars", Icon.Binoculars],
    ["Bubble", Icon.Bubble],
    ["Calendar", Icon.Calendar],
    ["Checkmark", Icon.Checkmark],
    ["ChevronDown", Icon.ChevronDown],
    ["ChevronUp", Icon.ChevronUp],
    ["Circle", Icon.Circle],
    ["Clipboard", Icon.Clipboard],
    ["Clock", Icon.Clock],
    ["Desktop", Icon.Desktop],
    ["Document", Icon.Document],
    ["Dot", Icon.Dot],
    ["Download", Icon.Download],
    ["Envelope", Icon.Envelope],
    ["ExclamationMark", Icon.ExclamationMark],
    ["Eye", Icon.Eye],
    ["EyeSlash", Icon.EyeSlash],
    ["Finder", Icon.Finder],
    ["Gear", Icon.Gear],
    ["Globe", Icon.Globe],
    ["Hammer", Icon.Hammer],
    ["LevelMeter", Icon.LevelMeter],
    ["Link", Icon.Link],
    ["List", Icon.List],
    ["MagnifyingGlass", Icon.MagnifyingGlass],
    ["MemoryChip", Icon.MemoryChip],
    ["Message", Icon.Message],
    ["Pencil", Icon.Pencil],
    ["Person", Icon.Person],
    ["Phone", Icon.Phone],
    ["Pin", Icon.Pin],
    ["Plus", Icon.Plus],
    ["Sidebar", Icon.Sidebar],
    ["SpeakerArrowDown", Icon.SpeakerArrowDown],
    ["SpeakerArrowUp", Icon.SpeakerArrowUp],
    ["SpeakerSlash", Icon.SpeakerSlash],
    ["Star", Icon.Star],
    ["Text", Icon.Text],
    ["TextDocument", Icon.TextDocument],
    ["QuesionMark", Icon.QuestionMark],
    ["Terminal", Icon.Terminal],
    ["Trash", Icon.Trash],
    ["Upload", Icon.Upload],
    ["Video", Icon.Video],
    ["Window", Icon.Window],
    ["XmarkCircle", Icon.XmarkCircle],
  ];

  return <IconsList icons={iconsList} />;
}

function IconsList(props: { icons: IconItem[] }) {
  return (
    <List searchBarPlaceholder="Filter icons by name...">
      {props.icons.map((icon) => (
        <IconListItem key={icon[0]} icon={icon} />
      ))}
    </List>
  );
}

function IconListItem(props: { icon: IconItem }) {
  const icon = props.icon;
  return (
    <List.Item
      id={icon[0]}
      title={icon[0]}
      icon={icon[1]}
      actions={
        <ActionPanel>
          <CopyToClipboardAction title="Copy Icon Name" content={`Icon.${icon[0]}`} />
        </ActionPanel>
      }
    />
  );
}
