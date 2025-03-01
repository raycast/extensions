import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";

type CalculationType = "ohms-law" | "power-factor" | "voltage-drop" | "time-constant";

type FormValues = {
  voltage?: string;
  current?: string;
  resistance?: string;
  realPower?: string;
  apparentPower?: string;
  resistancePerLength?: string;
  length?: string;
  timeConstantType?: "rc" | "rl";
  capacitance?: string;
  inductance?: string;
};

export default function ElectricalCalculator() {
  const [calcType, setCalcType] = useState<CalculationType>("ohms-law");
  const [result, setResult] = useState("");
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});

  const calculateValues = (values: FormValues) => {
    try {
      let calculation = "";
      switch (calcType) {
        case "ohms-law": {
          const v = parseFloat(values.voltage || "");
          const i = parseFloat(values.current || "");
          const r = parseFloat(values.resistance || "");

          if ([v, i, r].filter(Boolean).length !== 2) {
            throw new Error("Provide exactly two values");
          }

          if (v && i) calculation = `Resistance: ${(v / i).toFixed(4)} Ω`;
          else if (v && r) calculation = `Current: ${(v / r).toFixed(4)} A`;
          else if (i && r) calculation = `Voltage: ${(i * r).toFixed(4)} V`;
          break;
        }

        case "power-factor": {
          const p = parseFloat(values.realPower || "");
          const s = parseFloat(values.apparentPower || "");
          if (!p || !s) throw new Error("Both values required");
          calculation = `Power Factor: ${(p / s).toFixed(4)}`;
          break;
        }

        case "voltage-drop": {
          const current = parseFloat(values.current || "");
          const rPerLength = parseFloat(values.resistancePerLength || "");
          const length = parseFloat(values.length || "");
          if (!current || !rPerLength || !length) throw new Error("All values required");
          calculation = `Voltage Drop: ${(current * rPerLength * length).toFixed(4)} V`;
          break;
        }

        case "time-constant": {
          const resistance = parseFloat(values.resistance || "");
          const circuitType = values.timeConstantType;

          if (circuitType === "rc") {
            const capacitance = parseFloat(values.capacitance || "");
            calculation = `τ (RC): ${(resistance * capacitance).toFixed(6)} s`;
          } else {
            const inductance = parseFloat(values.inductance || "");
            calculation = `τ (RL): ${(inductance / resistance).toFixed(6)} s`;
          }
          break;
        }
      }

      setResult(calculation);
      showToast({ style: Toast.Style.Success, title: "Calculation Complete", message: calculation });
    } catch (error) {
      if (error instanceof Error) {
        showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      } else {
        showToast({ style: Toast.Style.Failure, title: "Error", message: "An unknown error occurred" });
      }
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={calculateValues} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="calcType"
        title="Calculation Type"
        value={calcType}
        onChange={(newValue) => setCalcType(newValue as CalculationType)}
      >
        <Form.Dropdown.Item value="ohms-law" title="Ohm's Law" />
        <Form.Dropdown.Item value="power-factor" title="Power Factor" />
        <Form.Dropdown.Item value="voltage-drop" title="Voltage Drop" />
        <Form.Dropdown.Item value="time-constant" title="Time Constant" />
      </Form.Dropdown>

      {calcType === "ohms-law" && (
        <>
          <Form.TextField id="voltage" title="Voltage (V)" />
          <Form.TextField id="current" title="Current (A)" />
          <Form.TextField id="resistance" title="Resistance (Ω)" />
        </>
      )}

      {calcType === "power-factor" && (
        <>
          <Form.TextField id="realPower" title="Real Power (W)" />
          <Form.TextField id="apparentPower" title="Apparent Power (VA)" />
        </>
      )}

      {calcType === "voltage-drop" && (
        <>
          <Form.TextField id="current" title="Current (A)" />
          <Form.TextField id="resistancePerLength" title="Resistance per Length (Ω/m)" />
          <Form.TextField id="length" title="Length (m)" />
        </>
      )}

      {calcType === "time-constant" && (
        <>
          <Form.Dropdown
            id="timeConstantType"
            title="Circuit Type"
            defaultValue="rc"
            onChange={(newValue) => handleInputChange("timeConstantType", newValue)}
          >
            <Form.Dropdown.Item value="rc" title="RC Circuit" />
            <Form.Dropdown.Item value="rl" title="RL Circuit" />
          </Form.Dropdown>
          <Form.TextField id="resistance" title="Resistance (Ω)" />

          {formValues.timeConstantType === "rc" ? (
            <Form.TextField
              id="capacitance"
              title="Capacitance (F)"
              onChange={(val) => handleInputChange("capacitance", val)}
            />
          ) : (
            <Form.TextField
              id="inductance"
              title="Inductance (H)"
              onChange={(val) => handleInputChange("inductance", val)}
            />
          )}
        </>
      )}

      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
