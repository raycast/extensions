import { Form } from "@raycast/api";
import { chat_providers_names } from "./providers.js";

export const ChatProvidersReact = (() => {
  // Display custom APIs in a separate section for organization
  let providers = [],
    customProviders = [];
  for (let x of chat_providers_names) {
    if (x[1] === "G4FLocal" || customProviders.length > 0) {
      customProviders.push(x);
    } else {
      providers.push(x);
    }
  }

  return (
    <>
      {providers.map((x) => (
        <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />
      ))}
      <Form.Dropdown.Section title="Custom APIs">
        {customProviders.map((x) => (
          <Form.Dropdown.Item title={x[0]} value={x[1]} key={x[1]} />
        ))}
      </Form.Dropdown.Section>
    </>
  );
})();
