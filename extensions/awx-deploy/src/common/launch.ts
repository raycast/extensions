import { Icon, Toast, confirmAlert, open, showToast } from "@raycast/api";

/** Confirm, launch, and surface the result as a toast with an "Open in AWX" action. */
export async function confirmAndLaunch(opts: {
  name: string;
  message?: string;
  confirmTitle?: string;
  launch: () => Promise<{ id: number }>;
  jobUrl: (id: number) => string;
}): Promise<void> {
  const ok = await confirmAlert({
    title: `Launch "${opts.name}"?`,
    message: opts.message ?? "This will start a new job with the template's default variables.",
    icon: Icon.Rocket,
    primaryAction: { title: opts.confirmTitle ?? "Launch" },
  });
  if (!ok) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: `Launching "${opts.name}"…` });
  try {
    const job = await opts.launch();
    toast.style = Toast.Style.Success;
    toast.title = `Launched #${job.id}`;
    toast.primaryAction = { title: "Open in AWX", onAction: () => open(opts.jobUrl(job.id)) };
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Launch failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
