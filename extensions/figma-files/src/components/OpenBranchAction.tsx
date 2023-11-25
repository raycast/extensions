import { Application, Action } from "@raycast/api";
import { Branch, File } from "../types";
export function OpenBranchAction(props: { branch: Branch; file: File; desktopApp: Application | undefined }) {
  const { branch, file, desktopApp } = props;
  return desktopApp ? (
    <Action.Open
      target={`figma://file/${file.key}/branch/${branch.key}`}
      application={desktopApp}
      title={branch.name}
      icon="branch.svg"
    />
  ) : (
    <Action.Open
      target={`https://figma.com/file/${file.key}/branch/${branch.key}`}
      title={branch.name}
      icon="branch.svg"
    />
  );
}
