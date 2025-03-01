import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { getApiToken, saveApiToken } from "../utils/graphql";

export default function TokenSetup({ onTokenSaved }: { onTokenSaved: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [defaultToken, setDefaultToken] = useState("");

  // Check if we already have a token stored
  useEffect(() => {
    async function checkToken() {
      try {
        const token = await getApiToken();
        if (token) {
          setDefaultToken(token);
        }
      } catch (error) {
        // Ignore errors when checking
      } finally {
        setIsLoading(false);
      }
    }

    checkToken();
  }, []);

  async function handleSubmit(values: { token: string }) {
    if (!values.token.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await saveApiToken(values.token.trim());
      onTokenSaved();
      pop();
    } catch (error) {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Token" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Update Your Stacks API Token" text="Enter your API token from the gqlToken cookie." />

      <Form.TextField
        id="token"
        title="Stacks API Token"
        placeholder="Paste your Stacks API token here"
        defaultValue={defaultToken}
        info="The token from the gqlToken cookie."
      />

      <Form.Description
        title="How to find your token"
        text={`
1. ${Icon.Globe} Open betterstacks.com and make sure you're logged in

2. ${Icon.Code} Open browser developer tools (Right-click → Inspect or Cmd+Option+I)

3. ${Icon.List} Navigate to 'Application' tab (Chrome) or 'Storage' tab (Firefox)

4. ${Icon.Box} Expand the 'Cookies' section 

5. ${Icon.Link} Select the betterstacks.com domain

6. ${Icon.MagnifyingGlass} Find the 'gqlToken' cookie

7. ${Icon.Clipboard} Copy the cookie value
        `}
      />

      <Form.Description text="Your token is stored securely and only used to communicate with the Stacks API." />
    </Form>
  );
}
