import { List, showToast, Toast, Clipboard, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

export default function GoldenRatioCommand() {
  const [inputNumber, setInputNumber] = useState("");
  const [smallerNumber, setSmallerNumber] = useState("");
  const [largerNumber, setLargerNumber] = useState("");

  useEffect(() => {
    const calculateGoldenRatio = () => {
      const phi = 1.61803398875; // Golden ratio
      const number = parseFloat(inputNumber);

      if (isNaN(number) || number <= 0) {
        setSmallerNumber("");
        setLargerNumber("");
        return;
      }

      setSmallerNumber((number / phi).toFixed(2));
      setLargerNumber((number * phi).toFixed(2));
    };

    calculateGoldenRatio();
  }, [inputNumber]);

  const handleCopyToClipboard = (value) => {
    Clipboard.copy(value);
    showToast(Toast.Style.Success, "Copied to clipboard", value);
  };

  return (
    <List
      searchBarPlaceholder="Enter a number"
      onSearchTextChange={setInputNumber}
      throttle
    >
      {smallerNumber && largerNumber ? (
        <>
          <List.Item
            icon={Icon.ChevronUpSmall}
            title="Smaller Number"
            subtitle={smallerNumber}
            actions={
              <ActionPanel>
                <Action title="Copy Smaller Number" onAction={() => handleCopyToClipboard(smallerNumber)} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.ChevronDownSmall}
            title="Larger Number"
            subtitle={largerNumber}
            actions={
              <ActionPanel>
                <Action title="Copy Larger Number" onAction={() => handleCopyToClipboard(largerNumber)} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <List.Item title="Please enter a number greater than zero" />
      )}
    </List>
  );
}
