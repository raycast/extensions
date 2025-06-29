import { List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { ActiveMount } from "../types";
import { unmountPath } from "../utils/mount";

interface ActiveMountListProps {
  activeMounts: ActiveMount[];
  onRefresh: () => void;
  language: string;
}

export function ActiveMountList({ activeMounts, onRefresh, language }: ActiveMountListProps) {
  const { pop } = useNavigation();
  const handleUnmount = async (mount: ActiveMount) => {
    try {
      await unmountPath(mount.mountPoint);
      await onRefresh();
      pop();
    } catch {
      // 에러는 unmountPath 함수에서 처리됨
    }
  };

  return (
    <List searchBarPlaceholder={language === "ko" ? "활성 마운트 검색..." : "Search active mounts..."}>
      {activeMounts.length === 0 ? (
        <List.EmptyView
          title={language === "ko" ? "활성 마운트가 없습니다" : "No active mounts"}
          description={language === "ko" ? "현재 마운트된 SSHFS가 없습니다" : "No mounted SSHFS"}
        />
      ) : (
        activeMounts.map((mount, index) => (
          <List.Item
            key={index}
            title={mount.device}
            subtitle={`${language === "ko" ? "마운트 위치" : "Mount location"}: ${mount.mountPoint}`}
            icon="⚡"
            accessories={[{ text: mount.type }]}
            actions={
              <ActionPanel>
                <Action
                  title={language === "ko" ? "언마운트" : "Unmount"}
                  icon="⏏️"
                  style={Action.Style.Destructive}
                  onAction={() => handleUnmount(mount)}
                />
                <Action title={language === "ko" ? "새로고침" : "Refresh"} icon="🔄" onAction={onRefresh} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
