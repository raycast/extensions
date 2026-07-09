import { showToast, Toast, open, LaunchProps } from "@raycast/api";
import {
  loadGoLinks,
  resolveTemplate,
  isHttpUrl,
  splitQuery,
  GoLinksError,
} from "./go-links";

type Arguments = {
  query: string;
};

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
): Promise<void> {
  const { query } = props.arguments;
  const { alias, args } = splitQuery(query);

  if (!alias) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing alias",
      message: "Type an alias as the first word, e.g. `j PROJ-123`.",
    });
    return;
  }

  let links;
  try {
    links = await loadGoLinks();
  } catch (err) {
    const message =
      err instanceof GoLinksError ? err.message : (err as Error).message;
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot load local go-links file",
      message,
    });
    return;
  }

  const template = links[alias];
  if (template === undefined) {
    await showToast({
      style: Toast.Style.Failure,
      title: `No local alias "${alias}"`,
      message: "Add it to your go-links.json file.",
    });
    return;
  }

  const result = resolveTemplate(template, args);
  if (result.kind === "missing-args") {
    const slots = result.needed.map((n) => `{${n}}`).join(", ");
    await showToast({
      style: Toast.Style.Failure,
      title: `"${alias}" needs more arguments`,
      message: `Missing values for ${slots}. You provided ${result.provided}.`,
    });
    return;
  }

  if (!isHttpUrl(result.url)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Refusing to open non-HTTP URL",
      message: result.url,
    });
    return;
  }

  await open(result.url);
}
