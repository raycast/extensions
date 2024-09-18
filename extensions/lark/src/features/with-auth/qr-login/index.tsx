import { Action, ActionPanel, Detail, environment, Icon, Image, showToast } from '@raycast/api';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toDataURL } from 'qrcode';
import { initQRCode, NextStep, QRCodeStatus, QRCodeUser } from '../../../services/auth';

interface QRLoginProps {
  onConfirm: (cookies: string[]) => void;
}

export const QRLogin: React.FC<QRLoginProps> = ({ onConfirm }) => {
  const timer = useRef<NodeJS.Timeout>();
  const unmountedRef = useRef(false);
  const tokenRef = useRef('');
  const userRef = useRef<QRCodeUser | null>();
  const [markdown, setMarkdown] = useState<string>();
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
      userRef.current = null;
      setMarkdown(qrCodeMarkdown);
      setStatus(QRCodeStatus.NotScanned);
      showToast({ title: 'QR Code is refreshed' });

      const polling = async () => {
        const result = await qrCode.polling();

        if (unmountedRef.current || tokenRef.current !== qrCode.token) return;

        if (result.next_step === NextStep.EnterApp) {
          return onConfirm(result.cookie || []);
        }

        if (result.status === QRCodeStatus.Outdated) {
          return refreshQRCode();
        }

        userRef.current = result.user;
        setStatus(result.status);

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
              <Detail.Metadata.Label
                title="Status"
                icon={
                  userRef.current?.avatar_url
                    ? { source: userRef.current.avatar_url, mask: Image.Mask.Circle }
                    : Icon.Checkmark
                }
                text="Scanned"
              />
            ) : status === QRCodeStatus.Canceled ? (
              <Detail.Metadata.Label title="Status" icon={Icon.XMarkCircle} text="Cancelled" />
            ) : (
              <Detail.Metadata.Label title="Status" text={QRCodeStatus[status]} />
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
        environment.appearance === 'light'
          ? {
              light: '#0000',
              dark: '#262426',
            }
          : { light: '#0000', dark: '#dedede' },
    },
  );
  return `![](${qrCodeData})`;
}
