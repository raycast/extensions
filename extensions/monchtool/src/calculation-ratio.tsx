import {
  List,
  showToast,
  Toast,
  Clipboard,
  ActionPanel,
  Action,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";

export default function GoldenRatioCommand() {
  const [inputNumber, setInputNumber] = useState<string>("");
  const [shortSide, setShortSide] = useState<string>("");
  const [longSide, setLongSide] = useState<string>("");
  const [part1, setPart1] = useState<string>("");
  const [part2, setPart2] = useState<string>("");
  const [svgCode, setSvgCode] = useState<string>("");
  const [isGoldenRatio, setIsGoldenRatio] = useState<boolean>(true); // State to toggle between Golden and Silver ratio
  const [showDecimal, setShowDecimal] = useState<boolean>(false); // State to toggle decimal visibility, default to false (integer)
  const [sequence, setSequence] = useState<string[]>([]); // State to store sequence of ratios

  useEffect(() => {
    const calculateRatio = () => {
      const number = parseFloat(inputNumber);

      if (isNaN(number) || number <= 0) {
        setShortSide("");
        setLongSide("");
        setPart1("");
        setPart2("");
        setSvgCode("");
        setSequence([]);
        return;
      }

      let ratioConstant;
      if (isGoldenRatio) {
        ratioConstant = 1.618; // Golden ratio
      } else {
        ratioConstant = 1.414; // Silver ratio
      }

      const ratios = [];
      for (let i = -3; i <= 3; i++) {
        const ratioNumber = number * Math.pow(ratioConstant, i);
        const ratioText = showDecimal
          ? ratioNumber.toFixed(2)
          : Math.round(ratioNumber).toString();
        ratios.push(ratioText);
      }

      // Sort ratios numerically
      ratios.sort((a, b) => parseFloat(a) - parseFloat(b));

      setSequence(ratios);

      const short = showDecimal
        ? (number / ratioConstant).toFixed(2)
        : Math.round(number / ratioConstant).toString();
      const long = showDecimal
        ? (number * ratioConstant).toFixed(2)
        : Math.round(number * ratioConstant).toString();
      const part1Value = number / (1 + ratioConstant);
      const part1 = showDecimal
        ? part1Value.toFixed(2)
        : Math.round(part1Value).toString(); // Short Side
      const part2Value = number - part1Value;
      const part2 = showDecimal
        ? part2Value.toFixed(2)
        : Math.round(part2Value).toString(); // Long Side

      setShortSide(short);
      setLongSide(long);
      setPart1(part1);
      setPart2(part2);

      const totalWidth = sequence.reduce(
        (acc, value) => acc + parseFloat(value),
        0,
      );
      let xCoordinate = 0;
      const svg = `
        <svg width="${totalWidth}" height="${sequence[6]}" xmlns="http://www.w3.org/2000/svg">
          ${sequence
            .map((value, index) => {
              const fill =
                index === 0
                  ? "skyblue"
                  : index === 1
                    ? "lightcoral"
                    : index === 2
                      ? "yellowgreen"
                      : index === 3
                        ? "orange"
                        : index === 4
                          ? "purple"
                          : index === 5
                            ? "lightpink"
                            : "cyan";

              const rectSvg = `<rect x="${xCoordinate}" y="0" width="${value}" height="${value}" fill="${fill}" />`;
              xCoordinate += parseFloat(value);
              return rectSvg;
            })
            .join("\n")}
        </svg>
      `;
      setSvgCode(svg.trim());
    };

    calculateRatio();
  }, [inputNumber, isGoldenRatio, showDecimal, sequence]);

  const handleCopyToClipboard = (values: string[]) => {
    const valueString = values.join(", ");
    Clipboard.copy(valueString);
    showToast(Toast.Style.Success, "Copied to clipboard", valueString);
  };

  const toggleRatioMode = () => {
    setIsGoldenRatio(!isGoldenRatio);
  };

  const toggleDecimalVisibility = () => {
    setShowDecimal(!showDecimal);
  };

  const shortSideText = showDecimal
    ? shortSide
    : parseInt(shortSide).toString();
  const longSideText = showDecimal ? longSide : parseInt(longSide).toString();
  const part1Text = showDecimal ? part1 : parseInt(part1).toString();
  const part2Text = showDecimal ? part2 : parseInt(part2).toString();

  return (
    <List
      searchBarPlaceholder="Enter a number"
      onSearchTextChange={setInputNumber}
      throttle
    >
      <List.Item
        title="Ratio Switch"
        icon={Icon.Ruler}
        accessories={[
          { text: isGoldenRatio ? "Golden Ratio" : "Silver Ratio" },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={isGoldenRatio ? "Golden Ratio" : "Silver Ratio"}
              onAction={toggleRatioMode}
            />
            <Action
              title={`Show ${showDecimal ? "Integer" : "Decimal"}`}
              onAction={toggleDecimalVisibility}
            />
          </ActionPanel>
        }
      />
      {sequence.length > 0 ? (
        <>
          <List.Item
            icon={Icon.CircleProgress25}
            title="Short Side"
            accessories={[{ text: shortSideText }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Short Side"
                  onAction={() => handleCopyToClipboard([shortSideText])}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.CircleProgress75}
            title="Long Side"
            accessories={[{ text: longSideText }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Long Side"
                  onAction={() => handleCopyToClipboard([longSideText])}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.CircleProgress100}
            title="Total"
            accessories={[{ text: `${part1Text}` }, { text: `${part2Text}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Total"
                  onAction={() =>
                    handleCopyToClipboard([part1Text, part2Text, inputNumber])
                  }
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Sequence"
            icon={Icon.Text}
            accessories={[
              { text: sequence[0] },
              { text: sequence[1] },
              { text: sequence[2] },
              { text: sequence[3] },
              { text: sequence[4] },
              { text: sequence[5] },
              { text: sequence[6] },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Sequence"
                  onAction={() => handleCopyToClipboard(sequence)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            icon={Icon.Code}
            title="SVG Rectangles"
            accessories={[{ text: "Copy SVG" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy SVG"
                  onAction={() => handleCopyToClipboard([svgCode])}
                />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <List.EmptyView
          icon={Icon.Text}
          title="No Results"
          description="Please enter a non-zero number."
        />
      )}
    </List>
  );
}
