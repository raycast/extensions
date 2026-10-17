import { Action, Keyboard } from "@raycast/api";

type OpenInOCIProps = {
  title?: string;
  route: string;
};
export default function OpenInOCI({ title = "Open in OCI", route }: OpenInOCIProps) {
  return (
    <Action.OpenInBrowser
      icon="red-cloud-white-bg-blue-b.png"
      title={title}
      url={`https://cloud.oracle.com/${route}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
