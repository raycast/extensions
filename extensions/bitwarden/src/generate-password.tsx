import {
  ActionPanel,
  List,
  Icon,
  Color,
  Clipboard,
  Action,
  showHUD
} from "@raycast/api";
import { PasswordOptions } from "./types";
import { useState } from "react";
import { useBitwarden, usePasswordGenerator } from "./hooks";
import { UnlockForm } from "./components";
import { Bitwarden } from "./api";

const GeneratePassword = () => {
  const bitwardenApi = new Bitwarden();
  const [state, setSessionToken] = useBitwarden(bitwardenApi);
  const [options, setOptions] = useState<PasswordOptions>();
  const { password, regeneratePassword, isGenerating } = usePasswordGenerator(bitwardenApi);

  if (state.vaultStatus === "locked") {
    return <UnlockForm setSessionToken={setSessionToken} bitwardenApi={bitwardenApi} />;
  }

  const copyToClipboard = async () => {
    if (!password) return;
    await Clipboard.copy(password);
    showHUD('Copied to clipboard')
  }

  const regenerate = () => regeneratePassword(options)
  
  return (
    <List>
      <List.Section title="Password" subtitle={isGenerating && password ? 'generating...' : undefined}>
      <List.Item 
        key="password" 
        id="password" 
        title={password ?? 'Generating password...'} 
        icon={{ source: Icon.Dot, tintColor: isGenerating ? Color.Orange : Color.Green }}
        actions={
          <ActionPanel>
            <Action
              title="Copy to clipboard"
              icon={Icon.Clipboard}
              onAction={copyToClipboard}
            />
          </ActionPanel>
        }
      />
      </List.Section>
      <List.Section title="Actions">
        <List.Item key="copy" id="copy" title="Copy password" icon={Icon.Clipboard} actions={
          <ActionPanel>
            <Action
              title="Copy to clipboard"
              icon={Icon.Clipboard}
              onAction={copyToClipboard}
            />
          </ActionPanel>
        } />
        <List.Item key="generate" id="generate" title="Regenerate password" icon={Icon.ArrowClockwise} actions={
          <ActionPanel>
            <Action
              title="Regenerate password"
              icon={Icon.ArrowClockwise}
              onAction={regenerate}
            />
          </ActionPanel>
        } />
        <List.Item key="options" id="options" title="Password options" icon={Icon.Gear} />
      </List.Section>
    </List>
  )
};

export default GeneratePassword;
