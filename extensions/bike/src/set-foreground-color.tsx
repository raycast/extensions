import { ActionPanel, List, Action, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import checkBikeInstalled from "./index";
import React from "react";

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
  await runAppleScript(`tell application "Bike"
      activate
      try
          set foreground color to choose color
      end try
    end tell`);
  showHUD("Set Bike foreground color");
}

async function white_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {65535, 65535, 65535}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function black_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {0, 0, 0}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function red_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {32768, 0, 0}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function orange_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {65535, 22768, 0}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function yellow_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {55535, 55535, 0}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function green_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {0, 32768, 0}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function teal_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {0, 32768, 32768}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function blue_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {0, 0, 65535}
  end tell`);
  showHUD("Set Bike foreground color");
}

async function purple_tc() {
  await runAppleScript(`tell application "Bike"
    activate
    set foreground color to {32768, 0, 32768}
  end tell`);
  showHUD("Set Bike foreground color");
}
