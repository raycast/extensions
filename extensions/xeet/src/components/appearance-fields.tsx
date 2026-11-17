import { Form } from "@raycast/api";
import { surfaces, type Options } from "../lib/settings";

export default function AppearanceFields({
  options,
  onChange,
}: {
  options: Options;
  onChange: (options: Options) => void;
}) {
  return (
    <>
      <Form.Dropdown
        id="surface"
        title="Surface"
        value={options.surface}
        onChange={(surface) => onChange({ ...options, surface: surface as Options["surface"] })}
      >
        {Object.entries(surfaces).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="theme"
        title="Theme"
        value={options.theme}
        onChange={(theme) => onChange({ ...options, theme: theme as Options["theme"] })}
      >
        <Form.Dropdown.Item value="light" title="Light" />
        <Form.Dropdown.Item value="dark" title="Dark" />
      </Form.Dropdown>
      <Form.Dropdown
        id="width"
        title="Width"
        value={String(options.width)}
        onChange={(width) => onChange({ ...options, width: Number(width) })}
      >
        {[320, 390, 600].map((width) => (
          <Form.Dropdown.Item key={width} value={String(width)} title={`${width} px`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="dpr"
        title="Resolution"
        value={String(options.dpr)}
        onChange={(dpr) => onChange({ ...options, dpr: Number(dpr) })}
      >
        {[1, 2, 3].map((dpr) => (
          <Form.Dropdown.Item key={dpr} value={String(dpr)} title={`${dpr}×`} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="expanded"
        label="Expand truncated post"
        value={options.expanded}
        onChange={(expanded) => onChange({ ...options, expanded })}
      />
    </>
  );
}
