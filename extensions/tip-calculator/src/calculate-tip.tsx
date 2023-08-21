import { Detail, LaunchProps, showToast, Toast, List, popToRoot, Icon, Color } from "@raycast/api";

export default function Command(props: LaunchProps) {
  const { bill, tip, people } = props.arguments;

  if (!Number.isNaN(bill) && bill >= 0 && !Number.isNaN(tip) && tip >= 0 && !Number.isNaN(people) && people >= 0) {
    return (
      <List navigationTitle="Search Beers" searchBarPlaceholder="Search Information...">
        <List.Section title="Inputted Values">
          <List.Item title={`Bill`} icon={Icon.Receipt} accessories={[{ text: `${bill}` }]} />
          <List.Item title={`Tip %`} icon={Icon.Coin} accessories={[{ text: `${tip}%` }]} />
          <List.Item title={`Number of People`} icon={Icon.TwoPeople} accessories={[{ text: `${people}` }]} />
        </List.Section>
        <List.Section title="Results">
          <List.Item
            title={`Tip Per Person`}
            icon={Icon.Coins}
            accessories={[{ text: `${(Number(bill) * Number(tip)) / 100 / Number(people)}` }]}
          />
          <List.Item
            title={`Total Per Person`}
            icon={Icon.Coins}
            accessories={[
              { text: `${(Number(bill) * Number(tip)) / 100 / Number(people) + Number(bill) / Number(people)}` },
            ]}
          />
        </List.Section>
      </List>
    );
  } else {
    popToRoot();
    showToast({ title: "Invalid Input", message: "Please use only numbers", style: Toast.Style.Failure });
  }
}
