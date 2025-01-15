import { KubernetesObject } from "@kubernetes/client-node";
import { Action, ActionPanel } from "@raycast/api";

export default function ResourceAction<T extends KubernetesObject>(props: {
  resource: T;
  isShowingDetail: boolean;
  setIsShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
  showManagedFields: boolean;
  setShowManagedFields: React.Dispatch<React.SetStateAction<boolean>>;
  showLastAppliedConfiguration: boolean;
  setShowLastAppliedConfiguration: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    resource,
    isShowingDetail,
    setIsShowingDetail,
    showManagedFields,
    setShowManagedFields,
    showLastAppliedConfiguration,
    setShowLastAppliedConfiguration,
  } = props;

  return (
    <ActionPanel>
      <Action title="Toggle Detail View" onAction={() => setIsShowingDetail(!isShowingDetail)} />
      <Action.CopyToClipboard
        title="Copy Name to Clipboard"
        content={resource.metadata?.name ?? ""}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {isShowingDetail && [
        <Action
          title="Toggle Show Managed Fields"
          onAction={() => setShowManagedFields(!showManagedFields)}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />,
        <Action
          title="Toggle Show Last Applied Configuration"
          onAction={() => setShowLastAppliedConfiguration(!showLastAppliedConfiguration)}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />,
      ]}
    </ActionPanel>
  );
}
