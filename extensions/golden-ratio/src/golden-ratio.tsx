import { List, showToast, Toast, Clipboard, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

export default function GoldenRatioCommand() {
  const [inputNumber, setInputNumber] = useState("");
  const [shortSide, setShortSide] = useState("");
  const [longSide, setLongSide] = useState("");
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [svgCode, setSvgCode] = useState("");

  useEffect(() => {
    const calculateGoldenRatio = () => {
      const phi = 1.61803398875; // Golden ratio
      const number = parseFloat(inputNumber);

      if (isNaN(number) || number <= 0) {
        setShortSide("");
        setLongSide("");
        setPart1("");
        setPart2("");
        setSvgCode("");
        return;
      }

      const short = (number / phi).toFixed(2);
      const long = (number * phi).toFixed(2);
      const part1 = (number / (1 + phi)).toFixed(2); // Short Side
      const part2 = (number - number / (1 + phi)).toFixed(2); // Long Side
      setShortSide(short);
      setLongSide(long);
      setPart1(part1);
      setPart2(part2);

      const svg = `
        <svg width="${(parseFloat(part1) + parseFloat(part2)).toFixed(2)}" height="${part2}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${part2}" height="${part2}" fill="skyblue" />
          <rect x="${part2}" width="${part1}" height="${part2}" fill="lightcoral" />
        </svg>
      `;
      setSvgCode(svg.trim());
    };

    calculateGoldenRatio();
  }, [inputNumber]);

  const handleCopyToClipboard = (values: string[]) => {
    const valueString = values.join(", ");
    Clipboard.copy(valueString);
    showToast(Toast.Style.Success, "Copied to clipboard", valueString);
  };

  return (
    <List searchBarPlaceholder="Enter a number" onSearchTextChange={setInputNumber} throttle>
      {shortSide && longSide && part1 && part2 ? (
        <>
          <List.Item
            icon={Icon.ChevronUpSmall}
            title="Short Side"
            subtitle={shortSide}
            actions={
              <ActionPanel>
                <Action title="Copy Short Side" onAction={() => handleCopyToClipboard([shortSide])} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.ChevronDownSmall}
            title="Long Side"
            subtitle={longSide}
            actions={
              <ActionPanel>
                <Action title="Copy Long Side" onAction={() => handleCopyToClipboard([longSide])} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Plus}
            title="Total"
            subtitle={`Short Side: ${part1}, Long Side: ${part2}`}
            actions={
              <ActionPanel>
                <Action title="Copy Total" onAction={() => handleCopyToClipboard([part1, part2, inputNumber])} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Code}
            title="SVG Rectangle"
            subtitle="Click to copy SVG code"
            actions={
              <ActionPanel>
                <Action title="Copy SVG" onAction={() => handleCopyToClipboard([svgCode])} />
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
