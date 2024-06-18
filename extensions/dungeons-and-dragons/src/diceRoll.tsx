import { List, Icon, Action, ActionPanel, Form } from "@raycast/api";
import { rollDiceToast } from "./utils/toasts";
import DiceAction from "./templates/diceAction";

export default function Command() {
  const diceItems = [
    { key: "1d2", title: "Coin", subtitle: "Flip a coin", roll: "1d2" },
    { key: "1d4", title: "1d4", subtitle: "Roll 1 four-sided die", roll: "1d4" },
    { key: "1d6", title: "1d6", subtitle: "Roll 1 six-sided die", roll: "1d6" },
    { key: "1d8", title: "1d8", subtitle: "Roll 1 eight-sided die", roll: "1d8" },
    { key: "1d10", title: "1d10", subtitle: "Roll 1 ten-sided die", roll: "1d10" },
    { key: "1d12", title: "1d12", subtitle: "Roll 1 twelve-sided die", roll: "1d12" },
    { key: "1d20", title: "1d20", subtitle: "Roll 1 twenty-sided die", roll: "1d20" },
    { key: "1d100", title: "1d100", subtitle: "Roll 1 hundred-sided die", roll: "1d100" },
  ];
  return (
    <List isLoading={false} searchBarPlaceholder={`Search dice`}>
      <List.Item
        title={`Custom Dice Roll`}
        icon={Icon.Cog}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={
                <Form
                  navigationTitle={`Roll a custom dice`}
                  actions={
                    <ActionPanel>
                      <Action.SubmitForm
                        title="Roll"
                        onSubmit={(values) => {
                          rollDiceToast({
                            roll: values.customDice,
                            before: "Custom ",
                            after: "",
                            includeRolls: true,
                          });
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.Description
                    title={`Custom Dice Role`}
                    text={`A dice roll following the format:\n(timesToRoll)d(sidedDice)(+/- Modifier). \nFor example: 1d4+1, 2d20-8, 5d2 (coinflips)`}
                  />
                  <Form.TextField id="customDice" title="Custom Dice Roll" placeholder={`2d8+3`} info={` `} />
                </Form>
              }
            />
          </ActionPanel>
        }
      />
      {diceItems.map((item) => (
        <List.Item
          key={item.key}
          icon={`icons/chance/${item.key}.png`}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel title={`Quick Roll`}>
              <DiceAction roll={item.roll} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
