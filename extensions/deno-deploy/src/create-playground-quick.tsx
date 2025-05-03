import { LocalStorage, Toast, open, showToast } from "@raycast/api";

import { requests } from "@/api/dash";
import { wait } from "@/utils";
import { showActionToast, showFailureToast } from "@/utils/toast";

const { createPlayground } = requests;

export default async (): Promise<void> => {
  const organizationId = await LocalStorage.getItem<string>("selectedOrganizationId");

  if (!organizationId) {
    await showFailureToast("No organization selected", new Error("No organization selected"));
    return;
  }

  try {
    const abort = showActionToast({ title: "Creating playground", cancelable: true });

    const project = await createPlayground(
      organizationId,
      'Deno.serve((req: Request) => new Response("Hello World"));\n',
      "ts",
      { signal: abort.signal },
    );

    const { name } = project;

    await open(`https://dash.deno.com/playground/${name}`);

    showToast(Toast.Style.Success, "Playground created successfully", "Playground creation");
  } catch (err) {
    await showFailureToast("Playground creation failed", err as Error);
    // Wait around until user has had chance to click the Toast action.
    // Note this only works for "no view" commands (actions still break when popping a view based command).
    // See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
    await wait(3000);
  }
};
