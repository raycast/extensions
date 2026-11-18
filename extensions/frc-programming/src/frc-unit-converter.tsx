import { List, Cache, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import { ParameterDisplay, ConversionResult } from "./unit-converters/general";
import { convertVelocity } from "./unit-converters/velocity";
import { convertAngularVelocity } from "./unit-converters/angular-velocity";
import { convertTorque } from "./unit-converters/torque";

const helpMarkdown = `
*Currently working units*

## Velocity:
- rpm
- m/s or mps
- ft/s or fps
- km/h or kph
- mph

## Angular Velocity:
- rpm
- rps or r/s or hz or rev/s
- rad/s or radian/s or radians/s
- deg/s or °/s

## Force & Torque:
- nm or n·m
- inlb or in-lb
- lbft or lbf·ft
- ozin or oz-in
- n or newton or newtons
- lbf or pound-force
`;

function applyConversionResult(conversionResult: ConversionResult): {
  convertedValue: number | null;
  parametersUsed: ParameterDisplay[] | null;
  parametersNeededStr: string;
} {
  return {
    convertedValue: conversionResult.result,
    parametersUsed: conversionResult.parametersUsed,
    parametersNeededStr:
      conversionResult.parametersNeeded.length > 0 ? conversionResult.parametersNeeded.join(", ") : "",
  };
}

function getMarkdown(conversionType: string, termsStr: string): [string, string] {
  let syntaxHelp = "";
  switch (conversionType) {
    case "Help":
      return [helpMarkdown, "N/A"];
    case "Velocity":
      syntaxHelp = "*Syntax: value unit to unit (parameter, parameter)*";
      break;
    case "Angular Velocity":
      syntaxHelp = "*Syntax: value unit to unit*";
      break;
    case "Force & Torque":
      syntaxHelp = "*Syntax: value unit to unit (parameter)*";
      break;
  }

  const parametersMatch = termsStr.match(/\(([^)]+)\)/);
  const parametersStr = parametersMatch ? parametersMatch[1] : "";
  const parametersTerms = parametersStr.split(",").map((term) => term.trim());

  const mainPart = termsStr.replace(/\(([^)]+)\)/, "");
  const mainTerms = mainPart.trim().split(/\s+/).filter(Boolean);

  let value = null;
  let fromUnit = null;
  let convertUnit = null;

  let convertedValue: number | null = null;
  let parametersUsed: ParameterDisplay[] | null = null;

  let parametersNeededStr = "";

  if (mainTerms.length >= 4) {
    value = Number.parseFloat(mainTerms[0]);
    fromUnit = mainTerms[1];
    convertUnit = mainTerms[3];

    if (!isNaN(value) && fromUnit && convertUnit) {
      const converter =
        conversionType === "Velocity"
          ? convertVelocity
          : conversionType === "Angular Velocity"
            ? convertAngularVelocity
            : conversionType === "Force & Torque"
              ? convertTorque
              : null;

      if (converter) {
        const conversionResult = applyConversionResult(converter(value, fromUnit, convertUnit, parametersTerms));
        convertedValue = conversionResult.convertedValue;
        parametersUsed = conversionResult.parametersUsed;
        parametersNeededStr = conversionResult.parametersNeededStr;
      }
    }
  }

  let markdown = ``;

  markdown += `${syntaxHelp}\n\n`;

  if (value !== null && !isNaN(value) && convertedValue !== null) {
    markdown += `# ${value} → ${convertedValue != null ? parseFloat(convertedValue.toFixed(4)).toString() : "N/A"}\n\n`;
  } else {
    markdown += `# Enter a value to convert...\n\n`;
  }

  if (fromUnit && convertUnit) {
    markdown += `## ${parametersNeededStr.includes("unrecognized input unit") ? "unrecognized" : fromUnit} → ${parametersNeededStr.includes("unrecognized output unit") ? "unrecognized" : convertUnit}\n\n`;
  }

  if (parametersUsed && parametersUsed.length > 0) {
    parametersUsed.forEach((param) => {
      const defaultLabel = param.isDefault ? " (default)" : "";
      markdown += `*${param.name}: ${param.value}${defaultLabel}*\n\n`;
    });
  }

  if (parametersNeededStr) {
    markdown += `**Needed: ${parametersNeededStr}**`;
  }

  return [markdown, convertedValue != null ? parseFloat(convertedValue.toFixed(4)).toString() : "N/A"];
}

const cache = new Cache();
const SEARCH_TEXT_KEY = "searchText";
const SELECTED_TYPE_KEY = "selectedConversionType";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedType, setSelectedType] = useState("Velocity");

  useEffect(() => {
    const cachedSearchText = cache.get(SEARCH_TEXT_KEY);
    const cachedType = cache.get(SELECTED_TYPE_KEY);

    if (cachedSearchText) {
      setSearchText(cachedSearchText);
    }
    if (cachedType) {
      setSelectedType(cachedType);
    }
  }, []);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    cache.set(SEARCH_TEXT_KEY, text);
  };

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    cache.set(SELECTED_TYPE_KEY, type);
  };

  let termsStr = "";
  if (searchText) {
    termsStr = searchText.toLowerCase();
  }

  const convertTypes = ["Velocity", "Angular Velocity", "Force & Torque", "Help"];

  const [detailMarkdown, answer] = getMarkdown(selectedType, termsStr);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      filtering={false}
      searchBarPlaceholder="Enter a value with a unit to convert, e.g. 5400 rpm"
      isShowingDetail
      selectedItemId={selectedType}
      onSelectionChange={(id) => id && handleSelectType(id)}
    >
      {convertTypes.map((conversionType) => (
        <List.Item
          key={conversionType}
          id={conversionType}
          title={conversionType}
          detail={<List.Item.Detail markdown={detailMarkdown} />}
          actions={
            <ActionPanel title="Unit Converter">
              <Action.CopyToClipboard title="Copy Answer" content={answer} />
              <Action title="Put Answer in Search Bar" onAction={() => setSearchText(answer + "")} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
