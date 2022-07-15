import { Action, ActionPanel, List } from "@raycast/api";
import type { PasswordGenerator } from "./utils/types";
import { getStrengthIcon } from "./utils/getStrengthIcon";

type Props = {
  generator: PasswordGenerator;
  generatePasswords: () => void;
};

const ListItem = ({ generator, generatePasswords }: Props): JSX.Element => (
  <List.Item
    key={generator.id}
    title={generator.password}
    subtitle={`Length: ${generator.password.length}`}
    accessories={[{ text: generator.title }]}
    icon={getStrengthIcon(generator.strength)}
    actions={
      <ActionPanel>
        <Action.CopyToClipboard title="Copy Password" content={generator.password} onCopy={generatePasswords} />
        <Action.Paste content={generator.password} onPaste={generatePasswords} />
      </ActionPanel>
    }
  />
);

export default ListItem;
