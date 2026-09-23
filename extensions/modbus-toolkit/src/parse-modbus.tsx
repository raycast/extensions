import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { DataDirection, ModbusProtocol, parseModbusFrame } from "./modbus";
import { ModbusResultList } from "./modbus-result";

const RTU_EXAMPLE = "10 06 02 02 00 03 6A F2";
const TCP_EXAMPLE = "00 01 00 00 00 06 01 03 00 00 00 02";
const ASCII_EXAMPLE = ":010302580002A0\r\n";

type FormValues = {
  protocol: ModbusProtocol;
  direction: DataDirection;
  frame: string;
};

export default function Command() {
  return <InputForm />;
}

function InputForm() {
  const { push } = useNavigation();
  const [protocol, setProtocol] = useState<ModbusProtocol>("rtu");
  const [direction, setDirection] = useState<DataDirection>("request");
  const [frame, setFrame] = useState(RTU_EXAMPLE);

  async function submit(values: FormValues) {
    try {
      push(
        <ModbusResultList
          result={parseModbusFrame(
            values.frame,
            values.protocol,
            values.direction,
          )}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Parse Frame",
        message:
          error instanceof Error ? error.message : "Enter a valid Modbus frame",
      });
    }
  }

  async function pasteFrame() {
    const text = await Clipboard.readText();
    if (text?.trim()) {
      setFrame(protocol === "ascii" ? text.trimStart() : text.trim());
    }
  }

  function useExample() {
    setDirection("request");
    setFrame(
      protocol === "rtu"
        ? RTU_EXAMPLE
        : protocol === "tcp"
          ? TCP_EXAMPLE
          : ASCII_EXAMPLE,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Parse Modbus Frame"
            icon={Icon.MagnifyingGlass}
            onSubmit={submit}
          />
          <Action
            title="Paste Frame from Clipboard"
            icon={Icon.Clipboard}
            onAction={pasteFrame}
          />
          <Action title="Use Example" icon={Icon.Wand} onAction={useExample} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={protocol}
        onChange={(value) => setProtocol(value as ModbusProtocol)}
      >
        <Form.Dropdown.Item value="rtu" title="Modbus RTU" />
        <Form.Dropdown.Item value="tcp" title="Modbus TCP" />
        <Form.Dropdown.Item value="ascii" title="Modbus ASCII" />
      </Form.Dropdown>
      <Form.Dropdown
        id="direction"
        title="Data Direction"
        value={direction}
        onChange={(value) => setDirection(value as DataDirection)}
      >
        <Form.Dropdown.Item value="request" title="Request" />
        <Form.Dropdown.Item value="response" title="Response" />
      </Form.Dropdown>
      <Form.TextArea
        id="frame"
        title="Data Package (ADU)"
        placeholder={
          protocol === "ascii"
            ? "For example: :010302580002A0"
            : "For example: 10 06 02 02 00 03 6A F2"
        }
        value={frame}
        onChange={setFrame}
      />
    </Form>
  );
}
