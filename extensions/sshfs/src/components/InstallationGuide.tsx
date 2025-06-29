import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";

export function InstallationGuide({ language }: { language: string }) {
  const { pop } = useNavigation();
  const title = language === "ko" ? "SSHFS-Mac 설치 가이드" : "SSHFS-Mac Installation Guide";
  const description =
    language === "ko"
      ? `이 플러그인은 SSHFS-Mac 래퍼 플러그인입니다.\n
SSHFS-Mac을 사용하여 원격 서버를 로컬 머신에 마운트할 수 있습니다.`
      : `This plugin is a wrapper for SSHFS-Mac.\n
You can use this plugin to mount remote servers to your local machine.`;
  const prerequisites =
    language === "ko"
      ? `## 사전 준비 사항
  - **macFUSE**: macOS용 FUSE (Filesystem in Userspace) 지원
  - **sshfs-mac**: SSH 파일시스템 마운트 도구`
      : `## Prerequisites
  - **macFUSE**: FUSE (Filesystem in Userspace) support for macOS
  - **sshfs-mac**: SSH filesystem mounting tool`;

  const installationProcess =
    language === "ko"
      ? `## 설치 과정
  ### 1. Homebrew를 사용하여 설치
  \`\`\`bash
  # macFUSE 설치
  brew install --cask macfuse

  # sshfs-mac 설치
  brew install gromgit/fuse/sshfs-mac
  \`\`\`
  `
      : `### 1. Installation via Homebrew
  \`\`\`bash
  # Install macFUSE
  brew install --cask macfuse

  # Install sshfs-mac
  brew install gromgit/fuse/sshfs-mac
  \`\`\`
  `;
  const systemPermissionConfiguration =
    language === "ko"
      ? `### 2. 시스템 권한 설정
  1. **시스템 설정** > **개인정보 보호 및 보안**으로 이동
  2. **보안** 섹션에서 macFUSE 커널 확장 승인
  3. 시스템 재시작 필요`
      : `### 2. System Permission Configuration
  1. Navigate to **System Settings** > **Privacy & Security**
  2. In the **Security** section, approve macFUSE kernel extension
  3. System restart may be required`;

  const markdown = `# ${title}

  ${description}

  ${prerequisites}

  ${installationProcess}

  ${systemPermissionConfiguration}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={language === "ko" ? "닫기" : "Close"} icon="🔄" onAction={() => pop()} />
          <Action.OpenInBrowser url="https://github.com/osxfuse/osxfuse/wiki/SSHFS" />
        </ActionPanel>
      }
    />
  );
}
