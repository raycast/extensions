import { Color, Icon, List } from "@raycast/api";
export default function CategoryDropdown(props: { onSelection: (newValue: string) => void }) {
  const { onSelection } = props;
  return (
    <List.Dropdown
      tooltip="Select Command Category"
      storeValue={true}
      onChange={(newValue) => {
        onSelection(newValue);
      }}
    >
      <List.Dropdown.Item key="All" title="All" value="All" />
      <List.Dropdown.Item title="Other" value="Other" icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
      <List.Dropdown.Item title="Data" value="Data" icon={{ source: Icon.List, tintColor: Color.Blue }} />
      <List.Dropdown.Item
        title="Development"
        value="Development"
        icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
      />
      <List.Dropdown.Item title="News" value="News" icon={{ source: Icon.Important, tintColor: Color.Blue }} />
      <List.Dropdown.Item title="Social" value="Social" icon={{ source: Icon.TwoPeople, tintColor: Color.Green }} />
      <List.Dropdown.Item title="Web" value="Web" icon={{ source: Icon.Network, tintColor: Color.Red }} />
      <List.Dropdown.Item title="Finance" value="Finance" icon={{ source: Icon.Coins, tintColor: Color.Blue }} />
      <List.Dropdown.Item title="Health" value="Health" icon={{ source: Icon.Heartbeat, tintColor: Color.Red }} />
      <List.Dropdown.Item
        title="Sports"
        value="Sports"
        icon={{ source: Icon.SoccerBall, tintColor: Color.PrimaryText }}
      />
      <List.Dropdown.Item title="Travel" value="Travel" icon={{ source: Icon.Airplane, tintColor: Color.Yellow }} />
      <List.Dropdown.Item title="Shopping" value="Shopping" icon={{ source: Icon.Cart, tintColor: Color.Purple }} />
      <List.Dropdown.Item
        title="Entertainment"
        value="Entertainment"
        icon={{ source: Icon.Video, tintColor: Color.Red }}
      />
      <List.Dropdown.Item title="Lifestyle" value="Lifestyle" icon={{ source: Icon.Person, tintColor: Color.Green }} />
      <List.Dropdown.Item
        title="Education"
        value="Education"
        icon={{ source: Icon.Bookmark, tintColor: Color.Orange }}
      />
      <List.Dropdown.Item title="Reference" value="Reference" icon={{ source: Icon.Book, tintColor: Color.Red }} />
      <List.Dropdown.Item title="Weather" value="Weather" icon={{ source: Icon.CloudSun, tintColor: Color.Blue }} />
      <List.Dropdown.Item title="Media" value="Media" icon={{ source: Icon.Image, tintColor: Color.Magenta }} />
      <List.Dropdown.Item title="Calendar" value="Calendar" icon={{ source: Icon.Calendar, tintColor: Color.Red }} />
      <List.Dropdown.Item
        title="Utilities"
        value="Utilities"
        icon={{ source: Icon.Calculator, tintColor: Color.Green }}
      />
    </List.Dropdown>
  );
}
