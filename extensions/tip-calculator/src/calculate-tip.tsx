import { LaunchProps, showToast, Toast, List, popToRoot, Icon, Color, getPreferenceValues } from "@raycast/api";

export default function Command(props: LaunchProps) {
  const { bill, tip, people } = props.arguments;

  const { currency, currencyPosition } = getPreferenceValues<ExtensionPreferences>();
  if (!Number.isNaN(bill) && bill >= 0 && !Number.isNaN(tip) && tip >= 0 && !Number.isNaN(people) && people > 0) {
    const billAmount = parseFloat(bill);
    const tipPercentage = parseFloat(tip);
    const peopleCount = parseFloat(people);

    const tipPerPerson = ((billAmount * tipPercentage) / 100 / peopleCount).toFixed(2);
    const totalPerPerson = ((billAmount * tipPercentage) / 100 / peopleCount + billAmount / peopleCount).toFixed(2);

    const currencyFormatter = (amount: string) => {
      return currencyPosition === "prepend" ? `${currency}${amount}` : `${amount}${currency}`;
    };

    return (
      <List navigationTitle="Calculate Tip" searchBarPlaceholder="Search Information...">
        <List.Section title="Inputted Values">
          <List.Item
            title="Bill (Total)"
            icon={Icon.Receipt}
            accessories={[{ text: currencyFormatter(billAmount.toFixed(2)) }]}
          />
          <List.Item title="Tip %" icon={Icon.Coin} accessories={[{ text: `${tip}%` }]} />
          <List.Item title="Number of People" icon={Icon.TwoPeople} accessories={[{ text: `${people} people` }]} />
        </List.Section>
        <List.Section title="Results">
          <List.Item
            title="Tip Per Person"
            icon={Icon.Coins}
            accessories={[{ text: currencyFormatter(tipPerPerson) }]}
          />
          <List.Item
            title="Total Per Person"
            icon={Icon.Coins}
            accessories={[{ text: currencyFormatter(totalPerPerson) }]}
          />
        </List.Section>
      </List>
    );
  } else if (people <= 0) {
    popToRoot();
    showToast({ title: "Invalid Input", message: "People can't be lower than 1", style: Toast.Style.Failure });
  } else {
    popToRoot();
    showToast({ title: "Invalid Input", message: "Please use only numbers", style: Toast.Style.Failure });
  }
}
