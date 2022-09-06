import { closeMainWindow, ActionPanel, List, Action } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Custom"
        actions={
          <ActionPanel>
            <Action
              title="Custom Foreground Color"
              onAction={() => {
                custom_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="White"
        actions={
          <ActionPanel>
            <Action
              title="White Foreground"
              onAction={() => {
                white_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Black"
        actions={
          <ActionPanel>
            <Action
              title="Black Foreground"
              onAction={() => {
                black_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Red"
        actions={
          <ActionPanel>
            <Action
              title="Red Foreground"
              onAction={() => {
                red_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Orange"
        actions={
          <ActionPanel>
            <Action
              title="Orange Foreground"
              onAction={() => {
                orange_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Yellow"
        actions={
          <ActionPanel>
            <Action
              title="Yellow Foreground"
              onAction={() => {
                yellow_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Green"
        actions={
          <ActionPanel>
            <Action
              title="Green Foreground"
              onAction={() => {
                green_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Teal"
        actions={
          <ActionPanel>
            <Action
              title="Teal Foreground"
              onAction={() => {
                teal_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Blue"
        actions={
          <ActionPanel>
            <Action
              title="Blue Foreground"
              onAction={() => {
                blue_tc();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Purple"
        actions={
          <ActionPanel>
            <Action
              title="Purple Foreground"
              onAction={() => {
                purple_tc();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function custom_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike"
        try
            set foreground color to choose color
        end try
    end tell`);
}

async function white_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {65535, 65535, 65535}`);
}

async function black_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {0, 0, 0}`);
}

async function red_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {32768, 0, 0}`);
}

async function orange_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {65535, 22768, 0}`);
}

async function yellow_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {55535, 55535, 0}`);
}

async function green_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {0, 32768, 0}`);
}

async function teal_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {0, 32768, 32768}`);
}

async function blue_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {0, 0, 65535}`);
}

async function purple_tc() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set foreground color to {32768, 0, 32768}`);
}
