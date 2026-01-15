import {
  List,
  ActionPanel,
  Action,
  Icon,
  open,
  showToast,
  Toast,
  Detail,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  WISPR_FLOW_BUNDLE_ID,
  isWisprFlowInstalled,
  ONBOARDING_KEY,
} from "./utils";

const welcomeMarkdown = `
# Welcome to Wispr Flow for Raycast

Control **Wispr Flow** voice-to-text directly from Raycast.

## Features

- **Start Recording** - Begin voice dictation instantly
- **Stop Recording** - End recording with a single command
- **Open App** - Quick access to Wispr Flow app

## Requirements

This extension requires [Wispr Flow](https://wisprflow.ai) to be installed on your Mac.

---

Press **Enter** to continue.
`;

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (showOnboarding === false) {
      checkInstallation();
    }
  }, [showOnboarding]);

  async function checkOnboarding() {
    const onboardingComplete =
      await LocalStorage.getItem<string>(ONBOARDING_KEY);
    setShowOnboarding(onboardingComplete !== "true");
  }

  async function completeOnboarding() {
    await LocalStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  }

  async function checkInstallation() {
    const installed = await isWisprFlowInstalled();
    setIsInstalled(installed);
  }

  async function startRecording() {
    await open("wispr-flow://start-hands-free", WISPR_FLOW_BUNDLE_ID);
    await showToast({ style: Toast.Style.Success, title: "Recording started" });
  }

  async function stopRecording() {
    await open("wispr-flow://stop-hands-free", WISPR_FLOW_BUNDLE_ID);
    await showToast({ style: Toast.Style.Success, title: "Recording stopped" });
  }

  async function openApp() {
    await open("wispr-flow://open", WISPR_FLOW_BUNDLE_ID);
  }

  // Loading state
  if (showOnboarding === null) {
    return <List isLoading={true} />;
  }

  // Onboarding screen (first time)
  if (showOnboarding) {
    return (
      <Detail
        markdown={welcomeMarkdown}
        actions={
          <ActionPanel>
            <Action
              title="Continue"
              icon={Icon.ArrowRight}
              onAction={completeOnboarding}
            />
            <Action.OpenInBrowser
              title="Download Wispr Flow"
              url="https://wisprflow.ai"
              icon={Icon.Download}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Checking installation
  if (isInstalled === null) {
    return <List isLoading={true} />;
  }

  // Not installed screen
  if (!isInstalled) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Wispr Flow Not Installed"
          description="This extension requires Wispr Flow to be installed on your Mac. Download it from wisprflow.ai"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Download Wispr Flow"
                url="https://wisprflow.ai"
                icon={Icon.Download}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Main view
  return (
    <List
      navigationTitle="Wispr Flow"
      searchBarPlaceholder="Search commands..."
    >
      <List.Section title="Voice Recording">
        <List.Item
          icon={Icon.Microphone}
          title="Start Recording"
          subtitle="Begin voice dictation"
          actions={
            <ActionPanel>
              <Action
                title="Start Recording"
                icon={Icon.Play}
                onAction={startRecording}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Stop}
          title="Stop Recording"
          subtitle="End voice dictation"
          actions={
            <ActionPanel>
              <Action
                title="Stop Recording"
                icon={Icon.Stop}
                onAction={stopRecording}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="App">
        <List.Item
          icon={Icon.AppWindow}
          title="Open Wispr Flow"
          subtitle="Open the Wispr Flow app"
          actions={
            <ActionPanel>
              <Action
                title="Open App"
                icon={Icon.AppWindow}
                onAction={openApp}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="About">
        <List.Item
          icon={Icon.Globe}
          title="Visit Wispr Flow Website"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Website"
                url="https://wisprflow.ai"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Code}
          title="View on GitHub"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View on GitHub"
                url="https://github.com/raycast/extensions/tree/main/extensions/wispr-flow"
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Person}
          title="Created by @mattiacolombomc"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View Profile"
                url="https://github.com/mattiacolombomc"
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
