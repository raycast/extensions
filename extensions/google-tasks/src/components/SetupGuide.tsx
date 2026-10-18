import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { hasPreferenceClientId, isValidClientId, saveClientId } from "../api/oauth";

type AccountType = "personal" | "workspace";

type Step = {
  title: string;
  markdown: string;
  url?: string;
  urlTitle?: string;
  copy?: { title: string; content: string };
};

const bundleId = "com.raycast";

function steps(accountType: AccountType): Step[] {
  const personal = accountType === "personal";
  return [
    {
      title: "Create a Google Cloud Project",
      markdown:
        "Create a new project, or select an existing one. The project is free and only holds your OAuth client.",
      url: "https://console.cloud.google.com/projectcreate",
      urlTitle: "Create Project",
    },
    {
      title: "Enable the Google Tasks API",
      markdown: [
        "Press **↵** to open the **Google Tasks API** page in the Google Cloud console.",
        "1. Check the project picker in the top bar. It must show the project from step 1. If it doesn't, click it and select your project.",
        "2. Click the blue **Enable** button and wait a few seconds.",
        "3. The API is enabled once the page shows **API Enabled** or switches to a **Manage** button.",
        "If the link doesn't open the right page, go to **APIs & Services → Library** in the console menu, search for *Google Tasks API*, and open it.",
      ].join("\n\n"),
      url: "https://console.cloud.google.com/apis/library/tasks.googleapis.com",
      urlTitle: "Open Google Tasks API",
    },
    {
      title: "Set Up the Consent Screen",
      markdown: personal
        ? "Choose **Get started**, enter an app name (for example *Raycast*) and your email.\n\nFor the audience, choose **External**."
        : "Choose **Get started**, enter an app name (for example *Raycast*) and your email.\n\nFor the audience, choose **Internal**. Only accounts in your organization can sign in, and you skip Google's verification warnings.",
      url: "https://console.cloud.google.com/auth/overview",
      urlTitle: "Open Consent Screen",
    },
    ...(personal
      ? [
          {
            title: "Publish the App",
            markdown:
              "Under **Audience**, choose **Publish app**.\n\nIf you leave the app in **Testing**, add your Google account as a test user. Google then asks you to sign in again every 7 days.",
            url: "https://console.cloud.google.com/auth/audience",
            urlTitle: "Open Audience",
          },
        ]
      : []),
    {
      title: "Create an OAuth Client",
      markdown: `Choose **Create client**, set the application type to **iOS**, and enter the Bundle ID \`${bundleId}\`.\n\nCopy the Client ID. It ends in \`.apps.googleusercontent.com\`.`,
      url: "https://console.cloud.google.com/auth/clients/create",
      urlTitle: "Create OAuth Client",
      copy: { title: "Copy Bundle ID", content: bundleId },
    },
    {
      title: "Add the Client ID to Raycast",
      markdown:
        "Press **↵** and paste the Client ID you copied in the previous step. Raycast saves it and signs you in to Google." +
        (personal
          ? "\n\nGoogle will warn that the app is unverified. That is expected for your own client: choose **Advanced**, then continue."
          : ""),
    },
  ];
}

const accountTypes: { value: AccountType; title: string; icon: Icon; markdown: string }[] = [
  {
    value: "personal",
    title: "Personal Gmail Account",
    icon: Icon.Person,
    markdown: "Your tasks live in a personal Google account, such as an `@gmail.com` address.",
  },
  {
    value: "workspace",
    title: "Work or School Account",
    icon: Icon.Building,
    markdown:
      "Your tasks live in a Google Workspace account managed by your company or school. Setup is shorter, and Google shows no verification warnings.",
  },
];

export default function SetupGuide(props: { title: string; message: string; onRetry: () => void }) {
  const [accountType, setAccountType] = useState<AccountType>();
  const [selectedId, setSelectedId] = useState<string>("status");
  const [done, setDone] = useState<Set<string>>(new Set());
  const guide = accountType ? steps(accountType) : [];

  const advance = (fromId: string, toId: string) => {
    setDone((previous) => new Set(previous).add(fromId));
    setSelectedId(toId);
  };

  return (
    <List
      navigationTitle={props.title}
      isShowingDetail
      selectedItemId={selectedId}
      onSelectionChange={(id) => id && setSelectedId(id)}
      searchBarPlaceholder="Set up Google Tasks"
    >
      <List.Section title="Status">
        <List.Item
          id="status"
          title="Client ID Needed"
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`## Set Up Google Tasks\n\n${props.message}\n\nGoogle Tasks needs a free OAuth Client ID from your own Google Cloud project. Press **↵** to choose your account type and go through the steps. It takes about five minutes and only has to be done once.`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Start Setup"
                icon={Icon.ArrowRight}
                onAction={() => setSelectedId(accountType ?? "personal")}
              />
              <Action.Push title="Enter Client ID" icon={Icon.Key} target={<ClientIdForm onSaved={props.onRetry} />} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Account Type">
        {accountTypes.map((type) => (
          <List.Item
            key={type.value}
            id={type.value}
            title={type.title}
            icon={type.icon}
            accessories={
              accountType === type.value ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green } }] : []
            }
            detail={
              <List.Item.Detail
                markdown={`## ${type.title}\n\n${type.markdown}\n\nPress **↵** to choose this account type.`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Choose Account Type"
                  icon={Icon.ArrowRight}
                  onAction={() => {
                    setAccountType(type.value);
                    setSelectedId(steps(type.value)[0].title);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Steps">
        {guide.map((step, index) => {
          const next = guide[index + 1];
          const isDone = done.has(step.title);
          return (
            <List.Item
              key={step.title}
              id={step.title}
              title={step.title}
              icon={
                isDone
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              accessories={[{ text: `${index + 1} of ${guide.length}` }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${index + 1}. ${step.title}\n\n${step.markdown}${
                    step.url ? `\n\n---\n\nPress **⌘O** to ${step.urlTitle?.toLowerCase() ?? "open the page"}.` : ""
                  }${next ? "\n\nPress **↵** when you're done to go to the next step." : ""}`}
                />
              }
              actions={
                <ActionPanel>
                  {next ? (
                    <Action title="Next Step" icon={Icon.ArrowRight} onAction={() => advance(step.title, next.title)} />
                  ) : (
                    <Action.Push
                      title="Enter Client ID"
                      icon={Icon.Key}
                      target={<ClientIdForm onSaved={props.onRetry} />}
                    />
                  )}
                  {step.url ? (
                    <Action.OpenInBrowser
                      title={step.urlTitle ?? "Open in Browser"}
                      url={step.url}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                  ) : null}
                  {step.copy ? (
                    <Action.CopyToClipboard
                      title={step.copy.title}
                      content={step.copy.content}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  ) : null}
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={() => void openExtensionPreferences()}
                  />
                  <Action title="Retry" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ClientIdForm(props: { onSaved: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  const submit = async (values: { clientId: string }) => {
    if (!isValidClientId(values.clientId)) {
      setError("Paste the Client ID ending in .apps.googleusercontent.com");
      return;
    }
    await saveClientId(values.clientId);
    await showToast({ style: Toast.Style.Success, title: "Client ID saved" });
    pop();
    props.onSaved();
  };

  return (
    <Form
      navigationTitle="Enter Client ID"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save and Connect" icon={Icon.Key} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste the Client ID of your iOS OAuth client. It is not an API key or client secret." />
      <Form.TextField
        id="clientId"
        title="Client ID"
        placeholder="123...apps.googleusercontent.com"
        error={error}
        onChange={() => setError(undefined)}
      />
      {hasPreferenceClientId() ? (
        <Form.Description text="A Client ID is also set in the extension preferences, and that one is used first. Clear it there if it is the wrong one." />
      ) : null}
    </Form>
  );
}
