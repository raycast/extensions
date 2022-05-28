import { Action, ActionPanel, Detail, environment, Icon, Image } from '@raycast/api';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toDataURL } from 'qrcode';
import { initQRCode, NextStep, QRCodeStatus, User } from '../../../services/auth';

interface QRLoginProps {
  onConfirm: (cookie: string[]) => void;
}

export const QRLogin: React.FC<QRLoginProps> = ({ onConfirm }) => {
  const timer = useRef<NodeJS.Timeout>();
  const unmountedRef = useRef(false);
  const tokenRef = useRef('');
  const [markdown, setMarkdown] = useState<string>();
  const [user, setUser] = useState<User | null>();
  const [status, setStatus] = useState(QRCodeStatus.Init);

  const cleanUp = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const refreshQRCode = useCallback(async () => {
    cleanUp();
    const qrCode = await initQRCode();
    if (qrCode) {
      tokenRef.current = qrCode.token;

      const qrCodeMarkdown = await getQRCodeMarkdownContent(qrCode.token);
      setMarkdown(qrCodeMarkdown);
      setStatus(QRCodeStatus.NotScanned);

      const polling = async () => {
        const result = await qrCode.polling();

        if (unmountedRef.current || tokenRef.current !== qrCode.token) return;

        if (result.next_step === NextStep.EnterApp) {
          return onConfirm(result.cookie || []);
        }

        if (result.status === QRCodeStatus.Outdated) {
          return refreshQRCode();
        }

        setStatus(result.status);
        setUser(result.user);

        if (timer.current && !unmountedRef.current && result.next_step === NextStep.Polling) {
          timer.current = setTimeout(polling, 500);
        }
      };

      if (!unmountedRef.current) {
        timer.current = setTimeout(polling, 500);
      }
    } else {
      setMarkdown('Failed to load QR code');
    }
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    refreshQRCode();

    return () => {
      unmountedRef.current = true;
      cleanUp();
    };
  }, []);

  return (
    <Detail
      navigationTitle="Login"
      markdown={markdown || 'Loading...'}
      metadata={
        markdown ? (
          <Detail.Metadata>
            {status === QRCodeStatus.NotScanned ? (
              <Detail.Metadata.Label title="Status" icon={Icon.Clock} text="Waiting for scanning" />
            ) : status === QRCodeStatus.Scanned ? (
              <Detail.Metadata.Label title="Status" icon={Icon.Checkmark} text="Scanned" />
            ) : status === QRCodeStatus.Canceled ? (
              <Detail.Metadata.Label title="Status" icon={Icon.XmarkCircle} text="Cancelled" />
            ) : (
              <Detail.Metadata.Label title="Status" text={QRCodeStatus[status]} />
            )}
            <Detail.Metadata.Separator />
            {user && (
              <Detail.Metadata.Label
                title="User"
                icon={{ source: user.avatar_url, mask: Image.Mask.Circle }}
                text={user.name}
              />
            )}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Refresh QR Code" onAction={refreshQRCode} />
        </ActionPanel>
      }
    />
  );
};

async function getQRCodeMarkdownContent(token: string): Promise<string> {
  const qrCodeData = await toDataURL(
    JSON.stringify({
      qrlogin: { token },
    }),
    {
      margin: 2,
      width: 300,
      color:
        environment.theme === 'light'
          ? {
              light: '#dedede',
              dark: '#262426',
            }
          : { light: '#262426', dark: '#dedede' },
    }
  );
  return `![](${qrCodeData})`;
}
