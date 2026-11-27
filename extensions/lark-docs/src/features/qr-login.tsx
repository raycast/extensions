import { Action, ActionPanel, Detail, environment, Icon, Image, Toast, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { toDataURL } from "qrcode";
import { initQRCode, NextStep, QRCodeStatus, QRCodeSession } from "../services/auth";

interface QRLoginProps {
  onConfirm: (cookies: string[]) => Promise<void>;
}

export function QRLogin({ onConfirm }: QRLoginProps) {
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const mounted = useRef(true);
  const activeToken = useRef("");
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [markdown, setMarkdown] = useState("Loading...");
  const [status, setStatus] = useState(QRCodeStatus.Init);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const refresh = useCallback(async () => {
    clearTimer();

    try {
      const session = await initQRCode();
      if (!mounted.current) return;

      activeToken.current = session.token;
      setAvatarUrl(undefined);
      setStatus(QRCodeStatus.NotScanned);
      setMarkdown(await createQRCodeMarkdown(session));

      const poll = async (qrSession: QRCodeSession) => {
        try {
          const result = await qrSession.polling();
          if (!mounted.current || activeToken.current !== qrSession.token) return;

          if (result.next_step === NextStep.EnterApp) {
            await onConfirm(result.cookies);
            return;
          }

          if (result.status === QRCodeStatus.Outdated) {
            await refresh();
            return;
          }

          setStatus(result.status);
          setAvatarUrl(result.user?.avatar_url);

          if (result.next_step === NextStep.Polling) {
            timer.current = setTimeout(() => poll(qrSession), 500);
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "QR Login Failed",
            message: error instanceof Error ? error.message : undefined,
          });
        }
      };

      timer.current = setTimeout(() => poll(session), 500);
    } catch (error) {
      setMarkdown("Failed to load QR code.");
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to Start Login",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }, [clearTimer, onConfirm]);

  useEffect(() => {
    mounted.current = true;
    void refresh();

    return () => {
      mounted.current = false;
      clearTimer();
    };
  }, [clearTimer, refresh]);

  return (
    <Detail
      navigationTitle="Login to Lark"
      markdown={markdown}
      metadata={
        markdown === "Loading..." ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" icon={statusIcon(status)} text={statusLabel(status)} />
            {status === QRCodeStatus.Scanned && avatarUrl ? (
              <Detail.Metadata.Label title="Account" icon={{ source: avatarUrl, mask: Image.Mask.Circle }} />
            ) : null}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action title="Refresh QR Code" icon={Icon.ArrowClockwise} onAction={refresh} />
        </ActionPanel>
      }
    />
  );
}

async function createQRCodeMarkdown(session: QRCodeSession): Promise<string> {
  const image = await toDataURL(
    JSON.stringify({
      qrlogin: { token: session.token },
    }),
    {
      margin: 2,
      width: 300,
      color:
        environment.appearance === "light" ? { light: "#0000", dark: "#262426" } : { light: "#0000", dark: "#dedede" },
    },
  );

  return `## Scan with Feishu/Lark

![Login QR code](${image})`;
}

function statusLabel(status: QRCodeStatus): string {
  switch (status) {
    case QRCodeStatus.NotScanned:
      return "Waiting for scan";
    case QRCodeStatus.Scanned:
      return "Scanned, confirm on your phone";
    case QRCodeStatus.Canceled:
      return "Cancelled";
    case QRCodeStatus.Confirmed:
      return "Confirmed";
    case QRCodeStatus.Outdated:
      return "Expired";
    default:
      return "Initializing";
  }
}

function statusIcon(status: QRCodeStatus): Icon {
  switch (status) {
    case QRCodeStatus.Scanned:
      return Icon.CheckCircle;
    case QRCodeStatus.Canceled:
      return Icon.XMarkCircle;
    case QRCodeStatus.NotScanned:
      return Icon.Clock;
    default:
      return Icon.Circle;
  }
}
