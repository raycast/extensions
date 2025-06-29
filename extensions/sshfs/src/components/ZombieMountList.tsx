import { List, ActionPanel, Action, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { ZombieMount } from "../types";
import { detectZombieMounts, forceCleanupZombieMount } from "../utils/zombie";

interface ZombieMountListProps {
  onRefresh: () => void;
  language: string;
}

export function ZombieMountList({ onRefresh, language }: ZombieMountListProps) {
  const [zombieMounts, setZombieMounts] = useState<ZombieMount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadZombieMounts();
  }, []);

  const loadZombieMounts = async () => {
    setIsLoading(true);
    try {
      const zombies = await detectZombieMounts();
      setZombieMounts(zombies);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: language === "ko" ? "좀비 마운트 탐지 실패" : "Zombie mount detection failed",
        message: error instanceof Error ? error.message : language === "ko" ? "알 수 없는 오류" : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async (zombie: ZombieMount) => {
    try {
      await forceCleanupZombieMount(zombie);
      await loadZombieMounts(); // 목록 새로고침
      await onRefresh(); // 메인 화면 새로고침
    } catch {
      // 에러는 forceCleanupZombieMount 함수에서 처리됨
    }
  };

  const handleCleanupAll = async () => {
    const confirmed = await confirmAlert({
      title: language === "ko" ? "모든 좀비 마운트 정리" : "Clean all zombie mounts",
      message: `${zombieMounts.length}개의 좀비 마운트를 모두 정리하시겠습니까?`,
      primaryAction: {
        title: language === "ko" ? "모두 정리" : "Clean all",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      for (const zombie of zombieMounts) {
        try {
          await forceCleanupZombieMount(zombie);
        } catch {
          // 개별 에러는 무시하고 계속 진행
        }
      }
      await loadZombieMounts();
      await onRefresh();
    }
  };

  const getStatusDescription = (status: ZombieMount["status"]) => {
    switch (status) {
      case "inaccessible":
        return language === "ko" ? "마운트되었지만 접근 불가" : "Mounted but inaccessible";
      case "process_only":
        return language === "ko" ? "프로세스만 남아있음" : "Process only left";
      case "mount_table_only":
        return language === "ko" ? "마운트 테이블에만 존재" : "Only in mount table";
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={language === "ko" ? "좀비 마운트 검색..." : "Search zombie mounts..."}
      actions={
        zombieMounts.length > 0 ? (
          <ActionPanel>
            <Action
              title={language === "ko" ? "모든 좀비 마운트 정리" : "Clean all zombie mounts"}
              icon="🧹"
              style={Action.Style.Destructive}
              onAction={handleCleanupAll}
            />
            <Action title={language === "ko" ? "새로고침" : "Refresh"} icon="🔄" onAction={loadZombieMounts} />
          </ActionPanel>
        ) : undefined
      }
    >
      {zombieMounts.length === 0 ? (
        <List.EmptyView
          title={language === "ko" ? "문제 있는 마운트가 없습니다" : "No zombie mounts"}
          description={language === "ko" ? "모든 마운트가 정상 상태입니다" : "All mounts are normal"}
          icon="✅"
        />
      ) : (
        zombieMounts.map((zombie, index) => (
          <List.Item
            key={`${zombie.mountPoint}-${index}`}
            title={zombie.mountPoint}
            subtitle={getStatusDescription(zombie.status)}
            icon="👻"
            accessories={[
              ...(zombie.device ? [{ text: zombie.device }] : []),
              ...(zombie.pid ? [{ text: `PID: ${zombie.pid}` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={language === "ko" ? "정리" : "Clean"}
                  icon="🧹"
                  style={Action.Style.Destructive}
                  onAction={() => handleCleanup(zombie)}
                />
                <Action title={language === "ko" ? "새로고침" : "Refresh"} icon="🔄" onAction={loadZombieMounts} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
