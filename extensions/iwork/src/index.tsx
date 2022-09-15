import { useEffect, useState } from "react";
import { List, getApplications, open, showToast, Toast } from "@raycast/api";
import React from "react";

export function checkPagesInstalled() {
  const [app, setApp] = useState<string | undefined>();

  useEffect(() => {
    Promise.resolve(getApplications()).then((apps) => {
      const app = apps.find((app) => app.name == "Pages");
      setApp(app?.name);
      if (app === undefined) setApp("");
    });
  }, []);

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Pages is not installed",
      primaryAction: {
        title: "Download Pages",
        onAction: (toast) => open("https://apps.apple.com/us/app/pages/id409201541?mt=12").then(() => toast.hide()),
      },
    });

    return (
      <List>
        <List.EmptyView title="You need to install Pages in order to use this command." icon="command-icon.png" />
      </List>
    );
  }
}

export function checkNumbersInstalled() {
  const [app, setApp] = useState<string | undefined>();

  useEffect(() => {
    Promise.resolve(getApplications()).then((apps) => {
      const app = apps.find((app) => app.name == "Numbers");
      setApp(app?.name);
      if (app === undefined) setApp("");
    });
  }, []);

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Numbers is not installed",
      primaryAction: {
        title: "Download Numbers",
        onAction: (toast) => open("https://apps.apple.com/us/app/numbers/id409203825?mt=12").then(() => toast.hide()),
      },
    });

    return (
      <List>
        <List.EmptyView title="You need to install Numbers in order to use this command." icon="command-icon.png" />
      </List>
    );
  }
}

export function checkKeynoteInstalled() {
  const [app, setApp] = useState<string | undefined>();

  useEffect(() => {
    Promise.resolve(getApplications()).then((apps) => {
      const app = apps.find((app) => app.name == "Keynote");
      setApp(app?.name);
      if (app === undefined) setApp("");
    });
  }, []);

  if (app === "") {
    showToast({
      style: Toast.Style.Failure,
      title: "Keynote is not installed",
      primaryAction: {
        title: "Download Keynote",
        onAction: (toast) => open("https://apps.apple.com/us/app/keynote/id409183694?mt=12").then(() => toast.hide()),
      },
    });

    return (
      <List>
        <List.EmptyView title="You need to install Keynote in order to use this command." icon="command-icon.png" />
      </List>
    );
  }
}
