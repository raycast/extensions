import { useNavigation, Detail } from "@raycast/api";
import { WorkspaceConfig } from "../types";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import { validateWorkspace } from "../utils/validateWorkspace";

export function WorkspaceSettingsDetail({ workspace }: { workspace: WorkspaceConfig }) {
  const { pop } = useNavigation();

  const { isLoading: isValidating, data: execute = false } = usePromise(async () => {
    const isValid = await validateWorkspace(workspace);
    if (isValid !== true) {
      await showFailureToast(isValid[1]);
      pop();
    }
    return true;
  });

  const { isLoading, data } = useFetch<Record<string, boolean | string | object | null>>(
    `${workspace.remoteURL}api/w/${workspace.workspaceId}/workspaces/get_settings`,
    {
      headers: {
        Authorization: `Bearer ${workspace.workspaceToken}`,
        "Content-Type": "application/json",
      },
      execute,
    }
  );

  return (
    <Detail
      isLoading={isValidating || isLoading}
      markdown={
        !data
          ? ""
          : `
| - | - |
|---|---|
${Object.entries(data)
  .map(([k, v]) => `| ${k} | ${JSON.stringify(v)} |`)
  .join(`\n`)}
`
      }
    />
  );
}
