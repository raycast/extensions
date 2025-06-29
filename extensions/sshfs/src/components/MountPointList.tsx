import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Alert, useNavigation } from "@raycast/api";
import { MountPoint } from "../types";
import { mountSSHFS } from "../utils/mount";

interface MountPointListProps {
  mountPoints: MountPoint[];
  onSave: (points: MountPoint[]) => void;
  onRefresh: () => void;
  language: string;
}

export function MountPointList({ mountPoints, onSave, onRefresh, language }: MountPointListProps) {
  const { pop } = useNavigation();
  const handleMount = async (mountPoint: MountPoint) => {
    try {
      await mountSSHFS(mountPoint);
      await onRefresh();
      pop();
    } catch {
      // 에러는 mountSSHFS 함수에서 처리됨
    }
  };

  const handleDelete = async (mountPoint: MountPoint) => {
    const confirmed = await confirmAlert({
      title: language === "ko" ? "마운트 포인트 삭제" : "Delete mount point",
      message: `"${mountPoint.name}"을 삭제하시겠습니까?`,
      primaryAction: {
        title: language === "ko" ? "삭제" : "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedPoints = mountPoints.filter((p) => p.id !== mountPoint.id);
      await onSave(updatedPoints);

      await showToast({
        style: Toast.Style.Success,
        title: language === "ko" ? "마운트 포인트 삭제됨" : "Mount point deleted",
        message: `${mountPoint.name} ${language === "ko" ? "삭제됨" : "deleted"}`,
      });
    }
  };

  return (
    <List searchBarPlaceholder={language === "ko" ? "마운트 포인트 검색..." : "Search mount point..."}>
      {mountPoints.length === 0 ? (
        <List.EmptyView
          title={language === "ko" ? "저장된 마운트 포인트가 없습니다" : "No saved mount points"}
          description={language === "ko" ? "새 마운트 포인트를 생성해보세요" : "Create a new mount point"}
        />
      ) : (
        mountPoints.map((mountPoint) => (
          <List.Item
            key={mountPoint.id}
            title={mountPoint.name}
            subtitle={`${mountPoint.user}@${mountPoint.host}:${mountPoint.remotePath} → ${mountPoint.localPath}`}
            icon="🖥️"
            accessories={[{ text: new Date(mountPoint.createdAt).toLocaleDateString() }]}
            actions={
              <ActionPanel>
                <Action
                  title={language === "ko" ? "마운트" : "Mount"}
                  icon="🔗"
                  onAction={() => handleMount(mountPoint)}
                />
                <Action
                  title={language === "ko" ? "삭제" : "Delete"}
                  icon="🗑️"
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(mountPoint)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
