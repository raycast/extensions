import { useState, useEffect } from "react";
import { List, showToast, ToastStyle, getPreferenceValues, Action, ActionPanel, AI, environment } from "@raycast/api";

import elementsData from "./data/elements.json";

const elementDetails: { [key: string]: { name: string; symbol: string; atomic_mass: number } } =
  elementsData.elements.reduce(
    (
      acc: { [key: string]: { name: string; symbol: string; atomic_mass: number } },
      element: { symbol: string; name: string; atomic_mass: number },
    ) => {
      acc[element.symbol] = { name: element.name, symbol: element.symbol, atomic_mass: element.atomic_mass };
      return acc;
    },
    {},
  );

// Remove naming helpers:
// - polyatomicIons
// - cationNames
// - anionNames
// - commonOrganicCompounds
// - nameCompound

async function getAINameForCompound(compound: string): Promise<string> {
  if (!environment.canAccess(AI)) {
    showToast(ToastStyle.Failure, "AI Unavailable", "Raycast Pro subscription required.");
    return compound;
  }
  try {
    return await AI.ask(
      `Return ONLY the name of this chemical compound: ${compound}. If there is no name, return the chemical compound that was inputted.`,
      {
        creativity: "low",
        model: "gpt-3.5-turbo",
      },
    );
  } catch (error) {
    showToast(ToastStyle.Failure, "AI Error", String(error));
    return compound;
  }
}

// Expand groups like (SO4)3 into SO4SO4SO4
function expandParentheses(formula: string): string {
  const groupRegex = /\(([^)]+)\)(\d*)/g;
  let expanded = formula;
  let match;
  while ((match = groupRegex.exec(expanded)) !== null) {
    const factor = parseInt(match[2] || "1", 10);
    let subExpanded = "";
    const subRegex = /([A-Z][a-z]*)(\d*)/g;
    let subMatch;
    while ((subMatch = subRegex.exec(match[1])) !== null) {
      const subElement = subMatch[1];
      const subCount = parseInt(subMatch[2] || "1", 10) * factor;
      subExpanded += subElement + (subCount > 1 ? subCount : "");
    }
    expanded = expanded.replace(match[0], subExpanded);
    groupRegex.lastIndex = 0; // reset regex index
  }
  return expanded;
}

// Modify the existing calculateMolarMass to call expandParentheses
const calculateMolarMass = (compound: string) => {
  const expanded = expandParentheses(compound);
  let mass = 0;
  const elements: { element: string; symbol: string; count: number; mass: number }[] = [];
  const regex = /([A-Z][a-z]*)(\d*)/g;
  let match;
  while ((match = regex.exec(expanded)) !== null) {
    const element = match[1];
    const count = parseInt(match[2] || "1", 10);
    if (elementDetails[element]) {
      const elementMass = elementDetails[element].atomic_mass * count;
      mass += elementMass;
      elements.push({
        element: elementDetails[element].name,
        symbol: elementDetails[element].symbol,
        count,
        mass: elementMass,
      });
    } else {
      showToast(ToastStyle.Failure, "Unknown element", `Element ${element} is not recognized.`);
      return { mass: 0, elements: [], name: "" };
    }
  }
  return { mass, elements, name: "" }; // Remove name from here
};

export default function CalculateMolarMass() {
  const [compound, setCompound] = useState("");
  const [molarMass, setMolarMass] = useState<number | null>(null);
  const [elements, setElements] = useState<{ element: string; symbol: string; count: number; mass: number }[]>([]);
  const [compoundName, setCompoundName] = useState<string>("");
  const { decimalPlaces } = getPreferenceValues<{ decimalPlaces: string }>();

  useEffect(() => {
    async function updateData() {
      if (compound) {
        const { mass, elements } = calculateMolarMass(compound);
        const aiName = await getAINameForCompound(compound);
        setMolarMass(mass);
        setElements(elements);
        setCompoundName(aiName);
      } else {
        setMolarMass(null);
        setElements([]);
        setCompoundName("");
      }
    }
    updateData();
  }, [compound]);

  return (
    <List searchBarPlaceholder="Enter compound (e.g., H2O)" onSearchTextChange={setCompound} throttle>
      {compoundName && (
        <List.Item
          title={`Compound Name: ${compoundName}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Compound Name" content={compoundName} />
            </ActionPanel>
          }
        />
      )}
      {elements.map((el, index) => (
        <List.Item
          key={index}
          title={el.element}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Element Info"
                content={`Element: ${el.element}, Symbol: ${el.symbol}, Count: ${el.count}`}
              />
            </ActionPanel>
          }
          accessories={[
            { text: el.symbol },
            { text: `Count: ${el.count}` },
            { text: `Mass: ${el.mass.toFixed(parseInt(decimalPlaces))} g/mol` },
          ]}
        />
      ))}
      {molarMass !== null && (
        <List.Item
          title={`Total Molar Mass: ${molarMass.toFixed(parseInt(decimalPlaces))} g/mol`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Molar Mass"
                content={`${molarMass.toFixed(parseInt(decimalPlaces))} g/mol`}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
