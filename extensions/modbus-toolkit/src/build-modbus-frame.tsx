import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  BuildFunctionCode,
  BuildRequestInput,
  buildModbusRequest,
} from "./modbus-builder";
import { ModbusProtocol, parseModbusFrame } from "./modbus";
import { ModbusResultList } from "./modbus-result";

export default function Command() {
  const { push } = useNavigation();
  const [protocol, setProtocol] = useState<ModbusProtocol>("rtu");
  const [functionCode, setFunctionCode] = useState<BuildFunctionCode>("3");
  const isRead = ["1", "2", "3", "4"].includes(functionCode);
  const isMultipleWrite = functionCode === "15" || functionCode === "16";

  async function submit(values: BuildRequestInput) {
    try {
      const frame = buildModbusRequest(values);
      push(
        <ModbusResultList
          result={parseModbusFrame(frame, values.protocol, "request")}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Build Frame",
        message:
          error instanceof Error ? error.message : "Check the request values",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Build Modbus Frame"
            icon={Icon.Hammer}
            onSubmit={submit}
          />
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
        id="functionCode"
        title="Function"
        value={functionCode}
        onChange={(value) => setFunctionCode(value as BuildFunctionCode)}
      >
        <Form.Dropdown.Item value="1" title="01 · Read Coils" />
        <Form.Dropdown.Item value="2" title="02 · Read Discrete Inputs" />
        <Form.Dropdown.Item value="3" title="03 · Read Holding Registers" />
        <Form.Dropdown.Item value="4" title="04 · Read Input Registers" />
        <Form.Dropdown.Item value="5" title="05 · Write Single Coil" />
        <Form.Dropdown.Item value="6" title="06 · Write Single Register" />
        <Form.Dropdown.Item value="15" title="0F · Write Multiple Coils" />
        <Form.Dropdown.Item value="16" title="10 · Write Multiple Registers" />
      </Form.Dropdown>
      <Form.TextField
        id="unitAddress"
        title="Unit Address"
        defaultValue="1"
        placeholder={protocol === "tcp" ? "0–255" : "0–247"}
      />
      {protocol === "tcp" ? (
        <Form.TextField
          id="transactionId"
          title="Transaction ID"
          defaultValue="1"
          placeholder="0–65535"
        />
      ) : null}
      <Form.TextField
        id="startingAddress"
        title="Starting Address"
        defaultValue="0"
        placeholder="Physical address, for example 100 or 0x0064"
      />
      {isRead ? (
        <Form.TextField id="quantity" title="Quantity" defaultValue="1" />
      ) : null}
      {functionCode === "5" ? (
        <Form.Dropdown id="coilValue" title="Coil Value" defaultValue="on">
          <Form.Dropdown.Item value="on" title="ON (FF00)" />
          <Form.Dropdown.Item value="off" title="OFF (0000)" />
        </Form.Dropdown>
      ) : null}
      {functionCode === "6" ? (
        <Form.TextField
          id="singleValue"
          title="Register Value"
          defaultValue="0"
          placeholder="0–65535 or 0x0000–0xFFFF"
        />
      ) : null}
      {isMultipleWrite ? (
        <Form.TextArea
          id="values"
          title={functionCode === "15" ? "Coil Values" : "Register Values"}
          placeholder={
            functionCode === "15"
              ? "1, 0, 1, 1 or on, off, on, on"
              : "1000, 2000, 0x1234"
          }
        />
      ) : null}
      <Form.Description
        title="Addressing"
        text="Starting Address is the zero-based physical address encoded in the PDU."
      />
    </Form>
  );
}
