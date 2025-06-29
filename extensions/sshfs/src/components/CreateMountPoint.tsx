import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { MountPoint } from "../types";

interface CreateMountPointProps {
  onSave: (points: MountPoint[]) => void;
  mountPoints: MountPoint[];
  language: string;
}

export function CreateMountPoint({ onSave, mountPoints, language }: CreateMountPointProps) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: {
    name: string;
    localPath: string;
    user: string;
    host: string;
    remotePath: string;
    password?: string;
    reconnect: boolean;
    serverAliveInterval: string;
    serverAliveCountMax: string;
  }) => {
    const newMountPoint: MountPoint = {
      id: Date.now().toString(),
      name: values.name,
      localPath: values.localPath,
      remotePath: values.remotePath,
      user: values.user,
      host: values.host,
      createdAt: new Date().toISOString(),
      password: values.password || undefined, // SSH 비밀번호 (빈 문자열인 경우 undefined로 처리)
      // SSHFS 옵션들 (기본값 포함)
      reconnect: values.reconnect ?? true,
      serverAliveInterval: parseInt(values.serverAliveInterval) || 15,
      serverAliveCountMax: parseInt(values.serverAliveCountMax) || 3,
    };

    const updatedPoints = [...mountPoints, newMountPoint];
    await onSave(updatedPoints);

    await showToast({
      style: Toast.Style.Success,
      title: language === "ko" ? "마운트 포인트 생성 완료" : "Mount point created",
      message: `${values.name} ${language === "ko" ? "생성됨" : "created"}`,
    });

    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={language === "ko" ? "생성" : "Create"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={language === "ko" ? "이름" : "Name"}
        placeholder={language === "ko" ? "예: 개발 서버" : "e.g. Development server"}
      />
      <Form.TextField
        id="localPath"
        title={language === "ko" ? "로컬 경로" : "Local path"}
        placeholder={language === "ko" ? "예: ~/remote-server" : "e.g. ~/remote-server"}
      />
      <Form.TextField
        id="user"
        title={language === "ko" ? "사용자명" : "User"}
        placeholder={language === "ko" ? "예: ubuntu" : "e.g. ubuntu"}
      />
      <Form.TextField
        id="host"
        title={language === "ko" ? "호스트" : "Host"}
        placeholder={language === "ko" ? "예: 192.168.1.100" : "e.g. 192.168.1.100"}
      />
      <Form.TextField
        id="remotePath"
        title={language === "ko" ? "원격 경로" : "Remote path"}
        placeholder={language === "ko" ? "예: /home/ubuntu" : "e.g. /home/ubuntu"}
      />
      <Form.PasswordField
        id="password"
        title={language === "ko" ? "SSH 비밀번호" : "SSH password"}
        placeholder={language === "ko" ? "SSH 비밀번호 (선택사항)" : "SSH password (optional)"}
        info={
          language === "ko" ? "SSH 키 인증이 설정된 경우 비워두세요" : "Leave empty if SSH key authentication is set"
        }
      />

      <Form.Separator />
      <Form.Description text={language === "ko" ? "고급 SSHFS 옵션" : "Advanced SSHFS options"} />

      <Form.Checkbox
        id="reconnect"
        title={language === "ko" ? "자동 재연결" : "Reconnect automatically"}
        label={language === "ko" ? "연결 끊김 시 자동으로 재연결" : "Reconnect automatically when connection is lost"}
        defaultValue={true}
      />

      <Form.TextField
        id="serverAliveInterval"
        title={language === "ko" ? "연결 확인 간격 (초)" : "Connection check interval (seconds)"}
        placeholder="15"
        defaultValue="15"
        info={
          language === "ko"
            ? "서버 연결 상태를 확인하는 간격 (초 단위)"
            : "Interval to check server connection (in seconds)"
        }
      />

      <Form.TextField
        id="serverAliveCountMax"
        title={language === "ko" ? "최대 연결 확인 실패 횟수" : "Maximum number of connection check failures"}
        placeholder="3"
        defaultValue="3"
        info={
          language === "ko"
            ? "연속으로 연결 확인에 실패할 수 있는 최대 횟수"
            : "Maximum number of consecutive connection check failures"
        }
      />
    </Form>
  );
}
