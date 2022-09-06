import { closeMainWindow, ActionPanel, List, Action } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  return (
    <List>
      <List.Item
        title="Custom"
        actions={
          <ActionPanel>
            <Action
              title="Custom Background Color"
              onAction={() => {
                custom_bg();
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
              title="White Background"
              onAction={() => {
                white_bg();
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
              title="Black Background"
              onAction={() => {
                black_bg();
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
              title="Red Background"
              onAction={() => {
                red_bg();
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
              title="Orange Background"
              onAction={() => {
                orange_bg();
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
              title="Yellow Background"
              onAction={() => {
                yellow_bg();
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
              title="Green Background"
              onAction={() => {
                green_bg();
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
              title="Teal Background"
              onAction={() => {
                teal_bg();
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
              title="Blue Background"
              onAction={() => {
                blue_bg();
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
              title="Purple Background"
              onAction={() => {
                purple_bg();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function custom_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike"
        try
            set background color to choose color
        end try
    end tell`);
}

async function white_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {65535, 65535, 65535}`);
}

async function black_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {0, 0, 0}`);
}

async function red_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {32768, 0, 0}`);
}

async function orange_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {65535, 22768, 0}`);
}

async function yellow_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {55535, 55535, 0}`);
}

async function green_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {0, 32768, 0}`);
}

async function teal_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {0, 32768, 32768}`);
}

async function blue_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {0, 0, 65535}`);
}

async function purple_bg() {
  await closeMainWindow();
  await runAppleScript(`tell application "Bike" to set background color to {32768, 0, 32768}`);
}
