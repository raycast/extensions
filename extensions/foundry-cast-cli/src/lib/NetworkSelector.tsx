import { Form } from "@raycast/api";

export default function NetworkSelector() {
  return (
    <Form.Dropdown id="network" title="Network" defaultValue="1">
      <Form.Dropdown.Item title="Mainnet" value="1" />
      <Form.Dropdown.Item title="Polygon" value="137" />
      <Form.Dropdown.Item title="Optimism" value="10" />
      <Form.Dropdown.Item title="Arbitrum" value="42161" />
    </Form.Dropdown>
  );
}
