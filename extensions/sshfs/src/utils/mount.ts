import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { execAsync } from "./exec";
import { runCommand, findCommand } from "./commands";
import { MountPoint } from "../types";

export async function checkIfAlreadyMounted(localPath: string): Promise<boolean> {
  try {
    const expandedLocalPath = localPath.replace("~", process.env.HOME || "");
    const { stdout } = await runCommand("mount", `| grep "${expandedLocalPath}"`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function mountSSHFS(mountPoint: MountPoint): Promise<void> {
  const { user, host, remotePath, localPath, password, reconnect, serverAliveInterval, serverAliveCountMax } =
    mountPoint;
  const expandedLocalPath = localPath.replace("~", process.env.HOME || "");

  try {
    // 이미 마운트되어 있는지 확인
    const isAlreadyMounted = await checkIfAlreadyMounted(localPath);
    if (isAlreadyMounted) {
      const confirmed = await confirmAlert({
        title: "이미 마운트됨",
        message: `${expandedLocalPath}가 이미 마운트되어 있습니다. 언마운트 후 다시 마운트하시겠습니까?`,
        primaryAction: {
          title: "언마운트 후 재마운트",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "취소",
          style: Alert.ActionStyle.Cancel,
        },
      });

      if (!confirmed) {
        await showToast({
          style: Toast.Style.Animated,
          title: "마운트 취소됨",
          message: "사용자가 취소했습니다",
        });
        return;
      }

      // 기존 마운트 해제 시도
      try {
        await unmountPath(expandedLocalPath);
        await showToast({
          style: Toast.Style.Success,
          title: "언마운트 완료",
          message: "이제 새로 마운트합니다",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "언마운트 실패",
          message: "기존 마운트를 해제할 수 없습니다",
        });
        throw error;
      }
    }

    await runCommand("mkdir", `-p "${expandedLocalPath}"`);

    // SSHFS 옵션 동적 생성
    const options = [];
    if (reconnect) {
      options.push("reconnect");
    }
    options.push(`ServerAliveInterval=${serverAliveInterval}`);
    options.push(`ServerAliveCountMax=${serverAliveCountMax}`);

    const optionsString = options.join(",");

    // sshfs 명령어를 동적으로 찾기
    const sshfsPath = await findCommand("sshfs");
    if (!sshfsPath) {
      throw new Error("sshfs command not found. Please install sshfs-mac.");
    }

    let sshfsCommand;
    if (password && password.trim()) {
      // 비밀번호 인증 사용 (sshpass 필요)
      const escapedPassword = password.replace(/'/g, "'\"'\"'"); // 비밀번호 내 작은따옴표 이스케이프
      sshfsCommand = `echo '${escapedPassword}' | ${sshfsPath} -o ${optionsString},password_stdin ${user}@${host}:${remotePath} "${expandedLocalPath}"`;
    } else {
      // SSH 키 인증 사용
      sshfsCommand = `${sshfsPath} -o ${optionsString} ${user}@${host}:${remotePath} "${expandedLocalPath}"`;
    }

    await execAsync(sshfsCommand);

    await showToast({
      style: Toast.Style.Success,
      title: "마운트 성공",
      message: `${mountPoint.name}이 ${expandedLocalPath}에 마운트됨`,
    });
  } catch (error) {
    let errorTitle = "마운트 실패";
    let errorMessage = "알 수 없는 오류";

    if (error instanceof Error) {
      const errorText = error.message.toLowerCase();

      if (errorText.includes("permission denied") || errorText.includes("authentication failed")) {
        errorTitle = "SSH 인증 실패";
        errorMessage = password
          ? "비밀번호가 잘못되었거나 SSH 접속이 거부되었습니다."
          : "SSH 키 인증이 실패했습니다. 비밀번호를 입력하거나 SSH 키를 확인해주세요.";
      } else if (errorText.includes("no route to host") || errorText.includes("connection refused")) {
        errorTitle = "연결 실패";
        errorMessage = "호스트에 연결할 수 없습니다. 네트워크 연결과 호스트 주소를 확인해주세요.";
      } else if (errorText.includes("no such file or directory")) {
        errorTitle = "경로 오류";
        errorMessage = "원격 경로가 존재하지 않습니다. 경로를 확인해주세요.";
      } else if (errorText.includes("sshfs: command not found")) {
        errorTitle = "SSHFS 미설치";
        errorMessage = "SSHFS가 설치되지 않았습니다. 설치 가이드를 참조해주세요.";
      } else {
        errorMessage = error.message;
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: errorTitle,
      message: errorMessage,
    });

    // 비밀번호가 포함된 명령어는 로그에서 제외
    if (password) {
      console.error("SSHFS mount failed (password protected):", errorTitle, errorMessage);
    } else {
      console.error("SSHFS mount failed:", error);
    }

    throw error;
  }
}

export async function unmountPath(mountPath: string, force = false): Promise<void> {
  try {
    if (force) {
      await runCommand("diskutil", `unmount force "${mountPath}"`);
    } else {
      await runCommand("umount", `"${mountPath}"`);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "언마운트 성공",
      message: `${mountPath} 언마운트됨`,
    });
  } catch (error) {
    console.error("Error:", error);
    if (!force) {
      const confirmed = await confirmAlert({
        title: "강제 언마운트",
        message: "일반 언마운트가 실패했습니다. 강제로 언마운트하시겠습니까?",
        primaryAction: {
          title: "강제 언마운트",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        return unmountPath(mountPath, true);
      }
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "언마운트 실패",
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    throw error;
  }
}
