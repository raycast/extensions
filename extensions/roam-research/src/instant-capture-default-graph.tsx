import { getPreferenceValues, LaunchProps, LocalStorage, showHUD, showToast, Toast } from "@raycast/api";
import { CaptureError } from "./roamApi";
import { resolveInstantCapture, resolveCaptureTags } from "./utils";
import { captureWithOutbox } from "./outbox";

export default async function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  const text = props.arguments.text;

  if (!text?.trim()) {
    await showToast({ title: "Nothing to capture", message: "Text is empty", style: Toast.Style.Failure });
    return;
  }

  const raw = await LocalStorage.getItem<string>("graphs-config");
  const rawTemplates = await LocalStorage.getItem<string>("templates-config");
  let graphsConfig: GraphsConfigMap = {};
  let templatesConfig: TemplatesConfig = { templates: [] };
  try {
    graphsConfig = raw ? JSON.parse(raw) : {};
  } catch {
    await showToast({ title: "Config error", message: "Corrupted graph config", style: Toast.Style.Failure });
    return;
  }
  try {
    templatesConfig = rawTemplates ? JSON.parse(rawTemplates) : { templates: [] };
  } catch {
    await showToast({ title: "Config error", message: "Corrupted templates config", style: Toast.Style.Failure });
    return;
  }

  const resolved = resolveInstantCapture(templatesConfig, graphsConfig);
  if (!resolved) {
    await showToast({
      title: "No Instant Capture template set",
      message: "Set a graph-specific template as your Instant Capture template in Manage Capture Templates",
      style: Toast.Style.Failure,
    });
    return;
  }

  const { template, graphConfig } = resolved;

  if (graphConfig.capabilities?.append === false) {
    await showToast({
      title: `Graph "${graphConfig.nameField}" doesn't have append access`,
      style: Toast.Style.Failure,
    });
    return;
  }

  const preferences = getPreferenceValues<Preferences>();
  const tags = resolveCaptureTags(template, preferences);

  const result = await captureWithOutbox({
    graphName: graphConfig.nameField,
    token: graphConfig.tokenField,
    content: text,
    template: template.contentTemplate,
    tags,
    page: template.page || undefined,
    nestUnder: template.nestUnder || undefined,
    templateName: template.name,
  });

  if (result.success) {
    const target = template.page || "daily note";
    await showHUD(`Captured to ${graphConfig.nameField} / ${target}`);
  } else if (result.error instanceof CaptureError && result.error.isRetryable) {
    await showHUD(`Queued in outbox — will retry`);
  } else {
    await showToast({
      title: "Failed to capture",
      message: result.error?.message,
      style: Toast.Style.Failure,
    });
  }
}
