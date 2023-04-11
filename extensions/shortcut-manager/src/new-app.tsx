import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { $_SM_getApps, $_SM_initializeState, $_SM_setApps } from "./assets/mixins";
import { App } from "./utils";
import { SupportedApplications, SupportedLogos } from "./assets/constants";
import { useEffect, useState } from "react";

export default function NewApp() {
  const [appName, setAppName] = useState<string>("");
  const [logoSource, setLogoSource] = useState<string>("");

  async function saveApp() {
    if (appName.length === 0) {
      showToast({
        title: "App name empty.",
        style: Toast.Style.Failure,
      });
      return;
    }

    const apps = await $_SM_getApps();
    if (apps.some((el) => el.source === appName.toLowerCase())) {
      showToast({
        title: "Already existing source.",
        style: Toast.Style.Failure,
      });
      return;
    }

    if (SupportedApplications.some((el) => el.source === appName.toLowerCase())) {
      showToast({
        title: "Supported application exists.",
        style: Toast.Style.Failure,
      });

      const options: Alert.Options = {
        title: "Open Preferences",
        message: "Head to preferences to enable?",
        primaryAction: {
          title: "Take Me!",
          style: Alert.ActionStyle.Default,
        },
      };

      if (await confirmAlert(options)) {
        await openExtensionPreferences();
      }

      return;
    }

    const logo = SupportedLogos.find((el) => el.source === logoSource);
    // this should not happen
    if (!logo) {
      showToast({
        title: "ERROR: logo not found.",
        style: Toast.Style.Failure,
      });
      popToRoot();
      return;
    }

    const toast = await showToast({
      title: "Saving App",
      style: Toast.Style.Animated,
    });

    const app: App = { title: appName, source: appName.toLowerCase(), icon: logo.path };
    apps.push(app);
    await $_SM_setApps(apps);

    toast.style = Toast.Style.Success;
    toast.title = "App Saved";
    popToRoot();
  }

  useEffect(() => {
    const init = async () => {
      await $_SM_initializeState();
    };
    init();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save App"
            onSubmit={async () => {
              await saveApp();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="app-name" title="App Name" value={appName} onChange={setAppName} />
      <Form.Description title="Source" text={appName.toLowerCase()} />
      <Form.Dropdown id="logo" onChange={setLogoSource}>
        {SupportedLogos.map((logo) => {
          return <Form.Dropdown.Item title={logo.title} value={logo.source} icon={logo.path} key={logo.source} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
