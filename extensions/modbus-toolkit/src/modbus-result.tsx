import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import {
  buildModbusReport,
  formatModbusProtocolName,
  ModbusParseResult,
  ParsedField,
} from "./modbus";

export function ModbusResultList({ result }: { result: ModbusParseResult }) {
  const { pop } = useNavigation();
  const report = buildModbusReport(result);
  const direction = result.direction === "request" ? "Request" : "Response";

  return (
    <List
      navigationTitle="Parsed Modbus Frame"
      searchBarPlaceholder="Search fields, bytes, or values"
    >
      <List.Section
        title={`${formatModbusProtocolName(result.protocol)} ${direction}`}
      >
        <List.Item
          title={result.originalFrame}
          actions={
            <ResultActions result={result} report={report} onBack={pop} />
          }
        />
      </List.Section>
      <List.Section
        title="Parsed Fields"
        subtitle={`${result.fields.length} fields`}
      >
        {result.fields.map((field, index) => (
          <FieldItem
            key={`${field.description}-${index}`}
            field={field}
            result={result}
            report={report}
            onBack={pop}
          />
        ))}
      </List.Section>
    </List>
  );
}

function FieldItem(props: {
  field: ParsedField;
  result: ModbusParseResult;
  report: string;
  onBack: () => void;
}) {
  const { field } = props;
  const fieldText = `${field.description}: ${field.value} [${field.bytes}]`;
  return (
    <List.Item
      title={field.description}
      subtitle={field.bytes}
      accessories={[{ text: field.value }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy This Field" content={fieldText} />
          <Action.CopyToClipboard
            title="Copy Full Report"
            content={props.report}
          />
          <Action.Paste title="Paste Full Report" content={props.report} />
          <Action.CopyToClipboard
            title="Copy Normalized Frame"
            content={props.result.normalizedFrame}
          />
          <Action
            title="Back to Input"
            icon={Icon.ArrowLeft}
            onAction={props.onBack}
          />
        </ActionPanel>
      }
    />
  );
}

function ResultActions(props: {
  result: ModbusParseResult;
  report: string;
  onBack: () => void;
}) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Full Report" content={props.report} />
      <Action.CopyToClipboard
        title="Copy Frame"
        content={props.result.originalFrame}
      />
      <Action.Paste title="Paste Full Report" content={props.report} />
      <Action.CopyToClipboard
        title="Copy Normalized Frame"
        content={props.result.normalizedFrame}
      />
      <Action
        title="Back to Input"
        icon={Icon.ArrowLeft}
        onAction={props.onBack}
      />
    </ActionPanel>
  );
}
