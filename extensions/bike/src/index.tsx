import { List, getApplications, open, showToast, Toast } from "@raycast/api";

export const noApp = (
  <List>
    <List.EmptyView />
  </List>
);

export default function checkBikeInstalled() {
  const app = Promise.resolve(getApplications()).then((apps) => apps.find((app) => app.name == "Bike"));

  showToast({
    style: Toast.Style.Failure,
    title: "Bike is not installed",
    primaryAction: {
      title: "Download Bike",
      onAction: (toast) => open("https://hogbaysoftware.netlify.app/bike/").then(() => toast.hide()),
    },
  });

  if (app === undefined) {
    return (
      <List>
        <List.EmptyView title="You need to install Bike in order to use this extension." icon="command-icon.png" />
      </List>
    );
  }
}
