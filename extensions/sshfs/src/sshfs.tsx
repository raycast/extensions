import { List, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { MountPoint, ActiveMount, STORAGE_KEY } from "./types";
import { runPipeline } from "./utils/commands";
import { MountPointList } from "./components/MountPointList";
import { ActiveMountList } from "./components/ActiveMountList";
import { ZombieMountList } from "./components/ZombieMountList";
import { CreateMountPoint } from "./components/CreateMountPoint";
import { InstallationGuide } from "./components/InstallationGuide";
import { LanguageSetting } from "./components/LanguageSetting";

export default function Command() {
  const [mountPoints, setMountPoints] = useState<MountPoint[]>([]);
  const [activeMounts, setActiveMounts] = useState<ActiveMount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    loadMountPoints();
    loadActiveMounts();
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await LocalStorage.getItem<string>("language");
      if (stored) {
        setLanguage(stored);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: language === "ko" ? "언어 로드 실패" : "Language load failed",
        message: error instanceof Error ? error.message : language === "ko" ? "알 수 없는 오류" : "Unknown error",
      });
    }
  };

  const saveLanguage = async (language: string) => {
    await LocalStorage.setItem("language", language);
    setLanguage(language);
  };

  const loadMountPoints = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        setMountPoints(JSON.parse(stored));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: language === "ko" ? "마운트 포인트 로드 실패" : "Mount point load failed",
        message: error instanceof Error ? error.message : language === "ko" ? "알 수 없는 오류" : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveMounts = async () => {
    try {
      // mount 명령어를 동적으로 찾아서 사용
      // grep이 매치를 찾지 못해도(exit code 1) 에러가 아니므로 || true 추가
      const { stdout } = await runPipeline("mount | grep -E '(fuse|macfuse)' || true");
      console.log("[DEBUG] Raw mount output:", stdout); // 디버깅용

      const mounts = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          console.log("[DEBUG] Processing line:", line); // 디버깅용

          // macFUSE 출력 형식: device on mountpoint (type, options...)
          const match = line.match(/^(.+) on (.+) \(([^,]+)/);
          if (match) {
            const mount = {
              device: match[1],
              mountPoint: match[2],
              type: match[3],
            };
            console.log("[DEBUG] Parsed mount:", mount); // 디버깅용
            return mount;
          }
          // 기존 방식도 fallback으로 유지
          const parts = line.split(" ");
          return {
            device: parts[0] || "",
            mountPoint: parts[2] || "",
            type: parts[4] || "unknown",
          };
        })
        .filter((mount) => mount.device && mount.mountPoint); // 유효한 마운트만 필터링

      console.log("[DEBUG] Final mounts:", mounts); // 디버깅용
      setActiveMounts(mounts);
    } catch (error) {
      console.error("[DEBUG] Error loading mounts:", error); // 디버깅용
      setActiveMounts([]);
    }
  };

  const saveMountPoints = async (points: MountPoint[]) => {
    try {
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(points));
      setMountPoints(points);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: language === "ko" ? "마운트 포인트 저장 실패" : "Mount point save failed",
        message: error instanceof Error ? error.message : language === "ko" ? "알 수 없는 오류" : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={language === "ko" ? "SSHFS 기능 검색..." : "Search SSHFS features..."}
    >
      <List.Section title={language === "ko" ? "마운트 관리" : "Mount management"}>
        <List.Item
          title={language === "ko" ? "새 마운트 포인트 생성" : "Create new mount point"}
          subtitle={language === "ko" ? "새로운 SSH 마운트 포인트를 추가합니다" : "Add a new SSH mount point"}
          icon="📁"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "마운트 포인트 생성" : "Create mount point"}
                target={<CreateMountPoint onSave={saveMountPoints} mountPoints={mountPoints} language={language} />}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title={language === "ko" ? "마운트 포인트 목록" : "Mount point list"}
          subtitle={`${language === "ko" ? "저장된 마운트 포인트" : "Saved mount points"}: ${mountPoints.length}개`}
          icon="📋"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "마운트 포인트 보기" : "View mount point"}
                target={
                  <MountPointList
                    mountPoints={mountPoints}
                    onSave={saveMountPoints}
                    onRefresh={loadActiveMounts}
                    language={language}
                  />
                }
              />
            </ActionPanel>
          }
        />

        <List.Item
          title={language === "ko" ? "활성 마운트 해제" : "Unmount active mounts"}
          subtitle={`${language === "ko" ? "현재 마운트된 항목" : "Currently mounted items"}: ${activeMounts.length}개`}
          icon="⏏️"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "마운트 해제" : "Unmount"}
                target={
                  <ActiveMountList activeMounts={activeMounts} onRefresh={loadActiveMounts} language={language} />
                }
              />
            </ActionPanel>
          }
        />

        <List.Item
          title={language === "ko" ? "문제 있는 마운트 정리" : "Clean zombie mounts"}
          subtitle={
            language === "ko"
              ? "접근 불가능하거나 비정상 종료된 마운트를 정리합니다"
              : "Clean zombie mounts that are inaccessible or abnormal termination"
          }
          icon="🧹"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "문제 있는 마운트 정리" : "Clean zombie mounts"}
                target={<ZombieMountList onRefresh={loadActiveMounts} language={language} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={language === "ko" ? "시스템 정보" : "System information"}>
        <List.Item
          title={language === "ko" ? "SSHFS 설치 가이드" : "SSHFS installation guide"}
          subtitle={
            language === "ko" ? "macFUSE 및 sshfs-mac 설치 방법" : "Installation guide for macFUSE and sshfs-mac"
          }
          icon="ℹ️"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "설치 가이드 보기" : "View installation guide"}
                target={<InstallationGuide language={language} />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title={language === "ko" ? "언어 설정" : "Language setting"}
          subtitle={language === "ko" ? "한국어 / English" : "Korean / English"}
          icon="🌐"
          actions={
            <ActionPanel>
              <Action.Push
                title={language === "ko" ? "언어 설정" : "Language setting"}
                target={<LanguageSetting language={language} setLanguage={saveLanguage} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
