import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function ComputerToolkit() {
  const [selectedOption, setSelectedOption] = useState("cycleTime");
  const [frequency, setFrequency] = useState("");
  const [cycles, setCycles] = useState("");
  const [busWidth, setBusWidth] = useState("");
  const [clockSpeed, setClockSpeed] = useState("");
  const [bitRate, setBitRate] = useState("");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [result, setResult] = useState("");

  const calculateCycleTime = () => {
    try {
      const freq = parseFloat(frequency);
      const cyc = parseFloat(cycles);
      if (!freq || !cyc) throw new Error("Both fields required");
      if (freq <= 0 || cyc <= 0) throw new Error("Values must be positive");

      const time = cyc / freq;
      setResult(`${time.toFixed(9)} seconds`);
      showToast({ style: Toast.Style.Success, title: "Calculation complete" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: (error as Error).message });
    }
  };

  const calculateTransferRate = () => {
    try {
      const bus = parseFloat(busWidth);
      const clock = parseFloat(clockSpeed);
      if (!bus || !clock) throw new Error("Both fields required");
      if (bus <= 0 || clock <= 0) throw new Error("Values must be positive");

      const transferRate = bus * clock;
      setResult(`Data Transfer Rate: ${transferRate} bits/sec`);
      showToast({ style: Toast.Style.Success, title: "Calculation complete" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: (error as Error).message });
    }
  };

  const convertBitRateToByteRate = () => {
    try {
      const rate = parseFloat(bitRate);
      if (!rate) throw new Error("Please provide a bit rate");
      if (rate <= 0) throw new Error("Bit rate must be positive");

      const byteRate = rate / 8;
      setResult(`Byte Rate: ${byteRate} bytes/sec`);
      showToast({ style: Toast.Style.Success, title: "Conversion complete" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: (error as Error).message });
    }
  };

  const calculateMemoryBandwidth = () => {
    try {
      const freq = parseFloat(frequency);
      const bus = parseFloat(busWidth);
      const channels = parseInt(cycles, 10);
      if (!freq || !bus || !channels) throw new Error("All fields are required");
      if (freq <= 0 || bus <= 0 || channels <= 0) throw new Error("Values must be positive");

      const bandwidth = (freq * bus * channels) / 8;
      setResult(`Memory Bandwidth: ${bandwidth} bytes/sec`);
      showToast({ style: Toast.Style.Success, title: "Calculation complete" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: (error as Error).message });
    }
  };

  const calculatePowerConsumption = () => {
    try {
      const v = parseFloat(voltage);
      const i = parseFloat(current);
      if (!v || !i) throw new Error("Both voltage and current are required");
      if (v <= 0 || i <= 0) throw new Error("Values must be positive");

      const power = v * i;
      setResult(`Power Consumption: ${power} Watts`);
      showToast({ style: Toast.Style.Success, title: "Calculation complete" });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: (error as Error).message });
    }
  };

  const handleSubmit = () => {
    switch (selectedOption) {
      case "cycleTime":
        calculateCycleTime();
        break;
      case "transferRate":
        calculateTransferRate();
        break;
      case "bitRateToByteRate":
        convertBitRateToByteRate();
        break;
      case "memoryBandwidth":
        calculateMemoryBandwidth();
        break;
      case "powerConsumption":
        calculatePowerConsumption();
        break;
      default:
        showToast({ style: Toast.Style.Failure, title: "Invalid selection" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="selectedOption" title="Select Calculation" value={selectedOption} onChange={setSelectedOption}>
        <Form.Dropdown.Item value="cycleTime" title="Cycle Time" />
        <Form.Dropdown.Item value="transferRate" title="Transfer Rate" />
        <Form.Dropdown.Item value="bitRateToByteRate" title="Bit Rate to Byte Rate" />
        <Form.Dropdown.Item value="memoryBandwidth" title="Memory Bandwidth" />
        <Form.Dropdown.Item value="powerConsumption" title="Power Consumption" />
      </Form.Dropdown>

      {selectedOption === "cycleTime" && (
        <>
          <Form.TextField id="frequency" title="Frequency (Hz)" value={frequency} onChange={setFrequency} />
          <Form.TextField id="cycles" title="Number of Cycles" value={cycles} onChange={setCycles} />
        </>
      )}

      {selectedOption === "transferRate" && (
        <>
          <Form.TextField id="busWidth" title="Bus Width (bits)" value={busWidth} onChange={setBusWidth} />
          <Form.TextField id="clockSpeed" title="Clock Speed (Hz)" value={clockSpeed} onChange={setClockSpeed} />
        </>
      )}

      {selectedOption === "bitRateToByteRate" && (
        <Form.TextField id="bitRate" title="Bit Rate (bps)" value={bitRate} onChange={setBitRate} />
      )}

      {selectedOption === "memoryBandwidth" && (
        <>
          <Form.TextField id="frequency" title="Frequency (Hz)" value={frequency} onChange={setFrequency} />
          <Form.TextField id="busWidth" title="Bus Width (bits)" value={busWidth} onChange={setBusWidth} />
          <Form.TextField id="cycles" title="Number of Channels" value={cycles} onChange={setCycles} />
        </>
      )}

      {selectedOption === "powerConsumption" && (
        <>
          <Form.TextField id="voltage" title="Voltage (V)" value={voltage} onChange={setVoltage} />
          <Form.TextField id="current" title="Current (A)" value={current} onChange={setCurrent} />
        </>
      )}

      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
