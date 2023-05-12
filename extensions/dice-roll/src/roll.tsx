import { LaunchProps, List, ActionPanel, Action, Icon, Toast, showToast } from "@raycast/api";
import { randomInt } from "crypto";
import { useEffect, useState } from "react";

const defaultRoll = "1d20";

type Roll = {
  sides: number;
  count: number;
};

type Result = number;

const rollDie = (sides: number): Result => {
  return randomInt(sides) + 1;
};

const rollDice = (r: Roll): Result => {
  let result = 0;
  for (let i = 0; i < r.count; i++) {
    result += rollDie(r.sides);
  }
  return result;
};

const parseDiceString = (dice: string): { dice: string; result: Result } => {
  const rolls = dice.replaceAll(" ", "").split("+");
  let result = 0;
  for (const r of rolls) {
    if (r.includes("d")) {
      const [countStr, sidesStr] = r.split("d");
      const countParsed = parseInt(countStr);
      const count = isNaN(countParsed) ? 1 : countParsed;
      const sides = parseInt(sidesStr);
      result += rollDice({ count, sides });
    } else {
      const numParsed = parseInt(r);
      result += isNaN(numParsed) ? 0 : numParsed;
    }
  }

  return { dice, result };
};

type RollArguments = {
  dice?: string;
};

export default function Roll(props: LaunchProps<{ arguments: RollArguments }>) {
  const { arguments: args } = props;
  const [results, setResults] = useState<{ dice: string; result: Result }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [lastRoll, setLastRoll] = useState<{ dice: string; result: Result } | null>(null);
  const [isValid, setIsValid] = useState(false);

  const showErrorMessage = () => {
    showToast({ style: Toast.Style.Failure, title: "Invalid roll", message: "Make sure your write a valid roll." });
  };

  const handleRoll = (diceString = defaultRoll) => {
    try {
      const result = parseDiceString(diceString);
      setResults((prev) => [result, ...prev]);
      setLastRoll(result);
      setSearchText("");
    } catch (error) {
      showErrorMessage();
    }
  };

  const handleTextChange = (value: string) => {
    setSearchText(value);
    try {
      parseDiceString(value);
      setIsValid(true);
    } catch (error) {
      setIsValid(false);
    }
  };

  useEffect(() => {
    if (args.dice) {
      setIsLoading(true);
      handleRoll(args.dice);
      setIsLoading(false);
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleTextChange}
      searchBarPlaceholder={lastRoll === null ? defaultRoll : lastRoll.dice}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Some actions"
          value={searchText}
          onChange={(value) => (value.length > 0 ? handleRoll(value) : undefined)}
        >
          <List.Dropdown.Item title="Choose Dice" value="" />
          <List.Dropdown.Item title="1d20" value="1d20" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Roll Dice"
            onAction={() => handleRoll(searchText.length > 0 ? searchText : undefined)}
          ></Action>
        </ActionPanel>
      }
    >
      {!searchText &&
        results.map((result, i) => (
          <List.Item
            key={i}
            title={result.result.toString()}
            subtitle={result.dice}
            actions={
              <ActionPanel>
                <Action title="Roll Dice Again" onAction={() => handleRoll(result.dice)} />
              </ActionPanel>
            }
          />
        ))}
      {results.length < 1 ? (
        <List.EmptyView
          title="No dice rolled"
          icon={Icon.Box}
          description="Type in the dice you want to roll in the search bar!"
        />
      ) : (
        <List.EmptyView title="Roll" icon={Icon.Box} description={isValid ? searchText : "Not valid dice string"} />
      )}
    </List>
  );
}
