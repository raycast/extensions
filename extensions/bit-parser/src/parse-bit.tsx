import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";

type BaseMode = "auto" | "2" | "10" | "16";
type BitWidth = "8" | "16" | "32" | "64";
type BitOrder = "high-first" | "low-first";

const BASE_MODES: readonly BaseMode[] = ["auto", "2", "10", "16"];
const BIT_WIDTHS: readonly BitWidth[] = ["8", "16", "32", "64"];
const BIT_ORDERS: readonly BitOrder[] = ["high-first", "low-first"];
const EXAMPLE_VALUE = "0x8103";

type FormValues = {
  value: string;
  base: BaseMode;
  width: BitWidth;
  order: BitOrder;
  map: string;
};

type ParseResult = {
  value: bigint;
  width: number;
  order: BitOrder;
  names: Map<number, string>;
};

type BitInfo = {
  index: number;
  name: string;
  on: boolean;
  mask: string;
};

export default function Command(props: LaunchProps<{ arguments: { value?: string } }>) {
  return <InputForm initialValue={props.arguments?.value} />;
}

function InputForm(props: { initialValue?: string }) {
  const { push } = useNavigation();
  const [value, setValue] = useState(props.initialValue?.trim() ?? "");
  const [base, setBase] = useState<BaseMode>("auto");
  const [width, setWidth] = useState<BitWidth>("16");
  const [order, setOrder] = useState<BitOrder>("high-first");
  const [map, setMap] = useState("");

  async function submit(values: FormValues) {
    try {
      const parsed = parseValue(values.value, values.base);
      if (parsed < 0n) throw new Error("Negative values are not supported");
      const bitWidth = Number(values.width);
      const maximum = (1n << BigInt(bitWidth)) - 1n;
      if (parsed > maximum) {
        throw new Error(`Value does not fit in ${bitWidth} bits (maximum ${formatHex(maximum, bitWidth)})`);
      }

      push(
        <ResultList
          result={{
            value: parsed,
            width: bitWidth,
            order: values.order,
            names: parseMap(values.map),
          }}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Input",
        message: error instanceof Error ? error.message : "Enter a valid number",
      });
    }
  }

  async function pasteClipboard() {
    try {
      const text = await Clipboard.readText();
      if (!text?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard Empty",
          message: "Copy a value first",
        });
        return;
      }
      setValue(text.trim());
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Read Clipboard",
        message: error instanceof Error ? error.message : "Try copying the value again",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse Bits" icon={Icon.MagnifyingGlass} onSubmit={submit} />
          <Action title="Paste from Clipboard" icon={Icon.Clipboard} onAction={pasteClipboard} />
          <Action
            title="Use Example"
            icon={Icon.Wand}
            onAction={() => {
              setValue(EXAMPLE_VALUE);
              setBase("auto");
              setWidth("16");
              setOrder("high-first");
              setMap("");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title="Value"
        placeholder="For example: 0x8103, 33027, or 0b100101"
        value={value}
        onChange={setValue}
      />
      <Form.Dropdown
        id="base"
        title="Number Base"
        value={base}
        onChange={(newValue) => {
          if (isBaseMode(newValue)) setBase(newValue);
        }}
      >
        <Form.Dropdown.Item value="auto" title="Auto Detect" />
        <Form.Dropdown.Item value="10" title="Decimal" />
        <Form.Dropdown.Item value="16" title="Hexadecimal" />
        <Form.Dropdown.Item value="2" title="Binary" />
      </Form.Dropdown>
      <Form.Dropdown
        id="width"
        title="Bit Width"
        value={width}
        onChange={(newValue) => {
          if (isBitWidth(newValue)) setWidth(newValue);
        }}
      >
        <Form.Dropdown.Item value="8" title="8 bit" />
        <Form.Dropdown.Item value="16" title="16 bit" />
        <Form.Dropdown.Item value="32" title="32 bit" />
        <Form.Dropdown.Item value="64" title="64 bit" />
      </Form.Dropdown>
      <Form.Dropdown
        id="order"
        title="Bit Order"
        value={order}
        onChange={(newValue) => {
          if (isBitOrder(newValue)) setOrder(newValue);
        }}
      >
        <Form.Dropdown.Item value="high-first" title={`High Bit First (bit${Number(width) - 1} → bit0)`} />
        <Form.Dropdown.Item value="low-first" title={`Low Bit First (bit0 → bit${Number(width) - 1})`} />
      </Form.Dropdown>
      <Form.TextArea
        id="map"
        title="Bit Labels (Optional)"
        placeholder={"One label per line, for example:\n0=Emergency stop\n1=Overvoltage\n8=Communication fault"}
        value={map}
        onChange={setMap}
      />
    </Form>
  );
}

function ResultList(props: { result: ParseResult }) {
  const { pop } = useNavigation();
  const { value, width, order, names } = props.result;
  const bits = useMemo(() => buildBits(value, width, order, names), [value, width, order, names]);
  const activeBits = bits.filter((bit) => bit.on);
  const report = buildReport(value, width, order, names);

  return (
    <List searchBarPlaceholder="Search bits or labels" navigationTitle="Bit Parser Results">
      <List.Section title="Value">
        <List.Item
          title={formatHex(value, width)}
          subtitle={`DEC ${value.toString(10)}`}
          accessories={[{ text: groupBinary(value, width) }]}
          actions={<ResultActions report={report} onBack={pop} />}
        />
      </List.Section>

      <List.Section title="Bits Set to 1" subtitle={activeBits.length ? `${activeBits.length} set` : "None"}>
        {activeBits.length ? (
          activeBits.map((bit) => <BitItem key={`active-${bit.index}`} bit={bit} report={report} onBack={pop} />)
        ) : (
          <List.Item
            title="No Bits Are Set"
            icon={Icon.Circle}
            actions={<ResultActions report={report} onBack={pop} />}
          />
        )}
      </List.Section>

      <List.Section title="All Bits">
        {bits.map((bit) => (
          <BitItem key={bit.index} bit={bit} report={report} onBack={pop} />
        ))}
      </List.Section>
    </List>
  );
}

function BitItem(props: { bit: BitInfo; report: string; onBack: () => void }) {
  const { bit } = props;
  const line = `bit${bit.index}${bit.name ? `: ${bit.name}` : ""} = ${bit.on ? "1" : "0"}`;

  return (
    <List.Item
      title={`bit${bit.index}`}
      subtitle={bit.name || undefined}
      icon={bit.on ? Icon.CheckCircle : Icon.Circle}
      accessories={[{ text: bit.on ? "ON" : "OFF" }, { text: bit.mask }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy This Bit" content={line} />
          <Action.Paste title="Paste This Bit" content={line} />
          <Action.CopyToClipboard title="Copy Full Report" content={props.report} />
          <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={props.onBack} />
        </ActionPanel>
      }
    />
  );
}

function ResultActions(props: { report: string; onBack: () => void }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Full Report" content={props.report} />
      <Action.Paste title="Paste Full Report" content={props.report} />
      <Action title="Back to Input" icon={Icon.ArrowLeft} onAction={props.onBack} />
    </ActionPanel>
  );
}

function isBaseMode(value: string): value is BaseMode {
  return (BASE_MODES as readonly string[]).includes(value);
}

function isBitWidth(value: string): value is BitWidth {
  return (BIT_WIDTHS as readonly string[]).includes(value);
}

function isBitOrder(value: string): value is BitOrder {
  return (BIT_ORDERS as readonly string[]).includes(value);
}

function parseValue(raw: string, baseMode: BaseMode): bigint {
  const value = raw.trim().replace(/_/g, "").replace(/\s+/g, "");
  if (!value) throw new Error("Enter a value");

  switch (baseMode) {
    case "16": {
      const hex = value.replace(/^0x/i, "");
      if (!/^[0-9a-f]+$/i.test(hex)) throw new Error("Enter a valid hexadecimal value");
      return BigInt("0x" + hex);
    }
    case "2": {
      const bin = value.replace(/^0b/i, "");
      if (!/^[01]+$/.test(bin)) throw new Error("Enter a valid binary value");
      return BigInt("0b" + bin);
    }
    case "10": {
      if (!/^-?\d+$/.test(value)) throw new Error("Enter a valid decimal value");
      return BigInt(value);
    }
    case "auto": {
      if (/^0x[0-9a-f]+$/i.test(value)) return BigInt(value);
      if (/^0b[01]+$/i.test(value)) return BigInt(value);
      if (!/^-?\d+$/.test(value)) {
        throw new Error("Enter a decimal value, or prefix hex with 0x and binary with 0b");
      }
      return BigInt(value);
    }
    default: {
      const exhaustive: never = baseMode;
      throw new Error(`Unsupported number base: ${exhaustive}`);
    }
  }
}

function parseMap(raw: string) {
  const names = new Map<number, string>();

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const match =
      trimmed.match(/^bit\s*(\d+)\s*[:=,，、\-\s]\s*(.+)$/i) || trimmed.match(/^(\d+)\s*[:=,，、\-\s]\s*(.+)$/);
    if (!match) return;
    names.set(Number(match[1]), match[2].trim());
  });

  return names;
}

function buildBits(value: bigint, width: number, order: BitOrder, names: Map<number, string>) {
  const bits: BitInfo[] = [];

  const start = order === "high-first" ? width - 1 : 0;
  const end = order === "high-first" ? -1 : width;
  const step = order === "high-first" ? -1 : 1;

  for (let index = start; index !== end; index += step) {
    const on = ((value >> BigInt(index)) & 1n) === 1n;
    const mask = formatHex(1n << BigInt(index), width);
    bits.push({
      index,
      name: names.get(index) || "",
      on,
      mask,
    });
  }

  return bits;
}

function groupBinary(value: bigint, width: number) {
  const mask = (1n << BigInt(width)) - 1n;
  const bin = (value & mask).toString(2).padStart(width, "0");
  return bin.replace(/(.{4})/g, "$1 ").trim();
}

function formatHex(value: bigint, width: number) {
  const mask = (1n << BigInt(width)) - 1n;
  const chars = Math.ceil(width / 4);
  return "0x" + (value & mask).toString(16).toUpperCase().padStart(chars, "0");
}

function buildReport(value: bigint, width: number, order: BitOrder, names: Map<number, string>) {
  const active = [];
  const start = order === "high-first" ? width - 1 : 0;
  const end = order === "high-first" ? -1 : width;
  const step = order === "high-first" ? -1 : 1;

  for (let index = start; index !== end; index += step) {
    if (((value >> BigInt(index)) & 1n) === 1n) {
      const name = names.get(index);
      active.push(`bit${index}${name ? `: ${name}` : ""}`);
    }
  }

  return [
    `DEC: ${value.toString(10)}`,
    `HEX: ${formatHex(value, width)}`,
    `BIN: ${groupBinary(value, width)}`,
    "",
    active.length ? active.join("\n") : "No bits are set",
  ].join("\n");
}
