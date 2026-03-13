import { Form, Application } from "@raycast/api";

interface BrowserDropdownProps {
  browsers: Application[];
  selectedBrowser: string;
  onBrowserChange: (browser: string) => void;
}

export default function BrowserDropdown({ browsers, selectedBrowser, onBrowserChange }: BrowserDropdownProps) {
  return (
    <Form.Dropdown id="browser" title="Open with" value={selectedBrowser} onChange={onBrowserChange}>
      {browsers.map((app) => (
        <Form.Dropdown.Item key={app.bundleId} value={String(app.bundleId)} title={app.name} />
      ))}
    </Form.Dropdown>
  );
}
