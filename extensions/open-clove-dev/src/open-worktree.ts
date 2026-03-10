import { open, showHUD, showToast, Toast } from "@raycast/api";
import { readRoutes, parseWorktreeApps } from "./lib/portless";

export default async function Command(props: {
  arguments: { worktree: string };
}) {
  const worktree = props.arguments.worktree.trim().toLowerCase();

  let routes;
  try {
    routes = await readRoutes();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read portless routes",
      message: "Is portless running? Check ~/.portless/routes.json",
    });
    return;
  }

  const apps = parseWorktreeApps(routes, worktree);

  if (apps.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `No apps running for "${worktree}"`,
      message: "Start dev servers with: task dev",
    });
    return;
  }

  await Promise.all(apps.map((app) => open(app.url)));

  const appNames = apps.map((a) => a.app).join(", ");
  await showHUD(`Opened ${appNames} for ${worktree}`);
}
