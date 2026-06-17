import { useState } from "react";
import { Form, ActionPanel, Action, getPreferenceValues } from "@raycast/api";

interface Preferences {
  unit: string;
}

type Values = {
  distance: number;
  type: string;
};

type Type = {
  title: string;
  value: string;
  emissionsPerKm: number;
  emissionsPerMile: number;
};

const TYPES = [
  {
    title: "Car",
    value: "car",
    emissionsPerKm: 0.12,
    emissionsPerMile: 0.19,
  },
  {
    title: "Bus",
    value: "bus",
    emissionsPerKm: 0.03,
    emissionsPerMile: 0.05,
  },
  {
    title: "Train",
    value: "train",
    emissionsPerKm: 0.02,
    emissionsPerMile: 0.03,
  },
  {
    title: "Plane",
    value: "plane",
    emissionsPerKm: 0.28,
    emissionsPerMile: 0.44,
  },
] as Type[];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [emissions, setEmissions] = useState<number>(0);

  function handleSubmit(values: Values) {
    const type = TYPES.find((type) => type.value === values.type) as Type;

    const emissionsForUnit = preferences.unit === "km" ? type.emissionsPerKm : type.emissionsPerMile;

    setEmissions(values.distance * emissionsForUnit);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Emissions" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="distance" title={`Distance (${preferences.unit})`} placeholder="Enter distance" />
      <Form.Dropdown id="type" title="Type">
        {TYPES.map((type: Type, index: number) => (
          <Form.Dropdown.Item key={index} title={type.title} value={type.value} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text={`Emissions: ${emissions} kg CO2e`} />
    </Form>
  );
}
