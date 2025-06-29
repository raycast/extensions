import { showToast, Toast } from "@raycast/api";
import { runCommand, runPipeline } from "./commands";
import { ActiveMount, ZombieMount } from "../types";

export async function detectZombieMounts(): Promise<ZombieMount[]> {
  const zombieMounts: ZombieMount[] = [];

  try {
    // 1. 시스템 마운트 테이블에서 FUSE 마운트 확인
    const mountTableMounts = await getMountTableMounts();

    // 2. 활성 SSHFS 프로세스 확인
    const sshfsProcesses = await getSSHFSProcesses();

    // 3. 각 마운트 포인트의 실제 접근성 확인
    for (const mount of mountTableMounts) {
      try {
        // 마운트 포인트에 실제로 접근 가능한지 확인
        await runCommand("ls", `"${mount.mountPoint}" > /dev/null 2>&1`);
        // 접근 가능하면 정상 마운트이므로 건너뜀
      } catch {
        // 접근 불가능한 경우만 좀비 마운트로 판단
        zombieMounts.push({
          mountPoint: mount.mountPoint,
          device: mount.device,
          status: "inaccessible",
        });
      }
    }

    // 프로세스는 있지만 마운트 테이블에 없는 경우
    for (const process of sshfsProcesses) {
      const mountExists = mountTableMounts.some(
        (mount) => process.mountPoint && mount.mountPoint === process.mountPoint,
      );
      if (!mountExists && process.mountPoint) {
        zombieMounts.push({
          mountPoint: process.mountPoint,
          pid: process.pid,
          status: "process_only",
        });
      }
    }
  } catch (error) {
    console.error("좀비 마운트 탐지 중 오류:", error);
  }

  return zombieMounts;
}

export async function getMountTableMounts(): Promise<ActiveMount[]> {
  try {
    // mount 명령어를 동적으로 찾아서 사용
    // grep이 매치를 찾지 못해도(exit code 1) 에러가 아니므로 || true 추가
    const { stdout } = await runPipeline("mount | grep -E '(fuse|macfuse)' || true");
    return stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        // macFUSE 출력 형식: device on mountpoint (type, options...)
        const match = line.match(/^(.+) on (.+) \(([^,]+)/);
        if (match) {
          return {
            device: match[1],
            mountPoint: match[2],
            type: match[3],
          };
        }
        // 기존 방식도 fallback으로 유지
        const parts = line.split(" ");
        return {
          device: parts[0] || "",
          mountPoint: parts[2] || "",
          type: parts[4] || "fuse",
        };
      })
      .filter((mount) => mount.device && mount.mountPoint); // 유효한 마운트만 필터링
  } catch {
    return [];
  }
}

async function getSSHFSProcesses(): Promise<Array<{ pid: number; mountPoint?: string }>> {
  try {
    const { stdout } = await runPipeline("ps aux | grep sshfs | grep -v grep");
    return stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(/\s+/);
        const pid = parseInt(parts[1]);

        // sshfs 명령에서 마운트 포인트 추출 시도
        const commandLine = parts.slice(10).join(" ");
        const mountPointMatch = commandLine.match(/\s+([^\s]+)$/);
        const mountPoint = mountPointMatch ? mountPointMatch[1] : undefined;

        return { pid, mountPoint };
      })
      .filter((process) => !isNaN(process.pid));
  } catch {
    return [];
  }
}

export async function forceCleanupZombieMount(zombie: ZombieMount): Promise<void> {
  try {
    if (zombie.status === "inaccessible" || zombie.status === "mount_table_only") {
      // 강제 언마운트 (sudo 없이 시도)
      try {
        await runCommand("diskutil", `unmount force "${zombie.mountPoint}"`);
      } catch {
        // diskutil이 실패하면 umount 시도
        await runCommand("umount", `-f "${zombie.mountPoint}"`);
      }
    }

    if (zombie.pid && zombie.status === "process_only") {
      // 프로세스 강제 종료
      await runCommand("kill", `-9 ${zombie.pid}`);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "좀비 마운트 정리 완료",
      message: `${zombie.mountPoint} 정리됨`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "좀비 마운트 정리 실패",
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    throw error;
  }
}
