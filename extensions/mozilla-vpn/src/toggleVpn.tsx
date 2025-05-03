import { ActionPanel, List, Action, showToast, Toast } from '@raycast/api';
import { exec } from 'child_process';

export default function Command() {
  const runCommand = (command: string) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        showToast(
          Toast.Style.Failure,
          'Failed to execute command',
          error.message
        );
        return;
      }
      showToast(
        Toast.Style.Success,
        'Command executed successfully',
        stdout || stderr
      );
    });
  };

  return (
    <List>
      <List.Item
        title="Activate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              title="Activate VPN"
              onAction={() =>
                runCommand(
                  '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN activate'
                )
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Deactivate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              title="Deactivate VPN"
              onAction={() =>
                runCommand(
                  '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN deactivate'
                )
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
