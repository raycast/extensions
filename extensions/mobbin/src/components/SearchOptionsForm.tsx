import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type {
  AuthMode,
  ImageQuality,
  McpImageFormat,
  Platform,
  SearchKind,
  SearchMode,
  SearchOptions,
} from "../lib/types";

type EditableOptions = Pick<
  SearchOptions,
  "platform" | "mode" | "imageQuality" | "mcpImageFormat" | "limit"
>;

type Props = {
  authMode: AuthMode;
  kind: SearchKind;
  value: EditableOptions;
  onChange: (options: EditableOptions) => void;
};

type Values = {
  platform: Platform;
  mode: SearchMode;
  imageQuality: ImageQuality;
  mcpImageFormat: McpImageFormat;
  limit: string;
};

export function SearchOptionsForm({ authMode, kind, value, onChange }: Props) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Mobbin Search Options"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Search Options"
            onSubmit={(values: Values) => {
              onChange({
                platform: kind === "section" ? "web" : values.platform,
                mode: values.mode,
                imageQuality: values.imageQuality ?? value.imageQuality,
                mcpImageFormat: values.mcpImageFormat ?? value.mcpImageFormat,
                limit: Number(values.limit),
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {kind !== "section" ? (
        <Form.Dropdown
          id="platform"
          title="Platform"
          defaultValue={value.platform}
        >
          <Form.Dropdown.Item title="iOS" value="ios" />
          <Form.Dropdown.Item title="Web" value="web" />
        </Form.Dropdown>
      ) : (
        <Form.Description title="Platform" text="Web" />
      )}
      <Form.Dropdown id="mode" title="Search Mode" defaultValue={value.mode}>
        <Form.Dropdown.Item title="Deep" value="deep" />
        <Form.Dropdown.Item title="Standard" value="standard" />
      </Form.Dropdown>
      {authMode === "api-key" ? (
        <Form.Dropdown
          id="imageQuality"
          title="REST Image Quality"
          defaultValue={value.imageQuality}
        >
          <Form.Dropdown.Item title="Optimized" value="optimized" />
          <Form.Dropdown.Item title="High" value="high" />
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          id="mcpImageFormat"
          title="MCP Image Format"
          defaultValue={value.mcpImageFormat}
        >
          <Form.Dropdown.Item title="WebP" value="webp" />
          <Form.Dropdown.Item title="JPEG" value="jpg" />
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="limit"
        title="Result Limit"
        defaultValue={String(value.limit)}
      >
        <Form.Dropdown.Item title="10" value="10" />
        <Form.Dropdown.Item title="20" value="20" />
        <Form.Dropdown.Item title="50" value="50" />
        <Form.Dropdown.Item title="100" value="100" />
      </Form.Dropdown>
    </Form>
  );
}
