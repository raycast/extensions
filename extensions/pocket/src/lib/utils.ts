import { confirmAlert, open } from "@raycast/api";

export function titleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export async function showExportAlert() {
  await confirmAlert({
    title: "Pocket will only be available until July 8",
    message: "Go online to export your saved articles",
    primaryAction: {
      title: "Export",
      async onAction() {
        await open("https://getpocket.com/export");
      },
    },
    rememberUserChoice: true,
  });
}
