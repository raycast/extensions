/**
 * SSH_ASKPASS helper — ssh가 PW를 요구할 때 실행된다.
 * 1) Add Server의 1회용 PW: FIFO 경로(SSH_IMAGE_DROP_PW_PIPE)에서 읽음 (디스크·argv 미경유)
 * 2) Keychain 모드 전송: alias(SSH_IMAGE_DROP_ALIAS, 비밀 아님)로 Keychain에서 직접 조회
 */
export const ASKPASS_SCRIPT = `#!/bin/sh
if [ -n "$SSH_IMAGE_DROP_PW_PIPE" ]; then
  if [ -p "$SSH_IMAGE_DROP_PW_PIPE" ]; then
    /bin/cat "$SSH_IMAGE_DROP_PW_PIPE"
    rm -f "$SSH_IMAGE_DROP_PW_PIPE"
    exit 0
  fi
  exit 1
fi
exec /usr/bin/security find-generic-password -s ssh-image-drop -a "$SSH_IMAGE_DROP_ALIAS" -w
`;
