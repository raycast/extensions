import { getApplications, showToast, Toast, open } from "@raycast/api";

const shottrWebsite = "https://shottr.cc";

async function isShottrInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "cc.ffitch.shottr");
}

export function withShottrCheck<T>(fn: (props: T) => unknown) {
  return async function (props: T) {
    if (await isShottrInstalled()) {
      return fn(props);
    } else {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Shottr is not installed.",
        message: `Install it from: ${shottrWebsite}`,
        primaryAction: {
          title: `Go to ${shottrWebsite}`,
          onAction: (toast) => {
            open(shottrWebsite);
            toast.hide();
          },
        },
      };
      await showToast(options);
      return null;
    }
  };
}
