import { useEffect, useState } from "react";
import { List, getApplications, open, showToast, Toast } from "@raycast/api";

export default function checkBikeInstalled() {
  const [app, setApp] = useState<string | undefined>();

  useEffect(() => {
    getApplications().then((apps) => {
      const app = apps.find((app) => app.name == "Bike");
      setApp(app?.name);
      if (app === undefined) setApp("");
    });
  }, []);

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Bike is not installed",
      primaryAction: {
        title: "Download Bike",
        onAction: (toast) => open("https://hogbaysoftware.netlify.app/bike/").then(() => toast.hide()),
      },
    });

    return (
      <List>
        <List.EmptyView title="You need to install Bike in order to use this extension." icon="no-view.png" />
      </List>
    );
  }
}
