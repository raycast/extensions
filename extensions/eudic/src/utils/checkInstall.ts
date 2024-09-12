import { Toast, getApplications, open, showToast } from "@raycast/api";
import { EUDIC_BUNDLE_ID, EUDIC_OFFICAL_SITE } from "../constatnts";

async function isEudicInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === EUDIC_BUNDLE_ID);
}

export async function checkEudicInstallation() {
  if (!(await isEudicInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Eudic is not installed.",
      message: `Install it from: ${EUDIC_OFFICAL_SITE}`,
      primaryAction: {
        title: `Go to ${EUDIC_OFFICAL_SITE}`,
        onAction: (toast) => {
          open(`${EUDIC_OFFICAL_SITE}`);
          toast.hide();
        },
      },
    };

    await showToast(options);
    return false;
  }
  return true;
}
