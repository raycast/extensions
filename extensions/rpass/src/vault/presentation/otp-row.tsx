import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  generateOtp,
  type OtpResult,
} from "../../rpass/application/rpass-client";
import { copyPassword, pastePassword } from "./clipboard";
import { formatGpgAwareError } from "./gpg-timeout-help";

interface Props {
  entry: string;
  storepath: string;
  passphrase?: string;
  editTarget: ReactNode;
}

function urgencyColor(remaining: number, period: number): Color {
  const ratio = remaining / period;
  if (ratio > 0.5) return Color.Green;
  if (ratio > 0.25) return Color.Orange;
  return Color.Red;
}

function getRemainingSeconds(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function countdownProgress(remaining: number, period: number): number {
  return Math.min(1, Math.max(0, remaining / period));
}

export default function OtpRow({
  entry,
  storepath,
  passphrase,
  editTarget,
}: Props) {
  const [result, setResult] = useState<OtpResult | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const isRefreshingRef = useRef(false);
  const requestIdRef = useRef(0);

  const fetchOtp = useCallback(async () => {
    if (isRefreshingRef.current) return;

    const requestId = ++requestIdRef.current;
    isRefreshingRef.current = true;
    try {
      const data = await generateOtp(entry, storepath, passphrase);
      if (requestId !== requestIdRef.current) return;

      setResult(data);
      setRemaining(data.remaining_seconds);
      setExpiresAt(Date.now() + data.remaining_seconds * 1000);
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const message = formatGpgAwareError("Failed to generate TOTP", error);
        showToast(Toast.Style.Failure, "Failed to Generate TOTP", message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        isRefreshingRef.current = false;
      }
    }
  }, [entry, passphrase, storepath]);

  useEffect(() => {
    requestIdRef.current += 1;
    isRefreshingRef.current = false;
    setResult(null);
    setRemaining(0);
    setExpiresAt(null);
    fetchOtp();
  }, [fetchOtp]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateCountdown = () => {
      const nextRemaining = getRemainingSeconds(expiresAt);
      setRemaining(nextRemaining);
      if (nextRemaining === 0) fetchOtp();
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, fetchOtp]);

  const totpCode = result?.code;
  const displayCode = totpCode ?? "------";
  const period = result?.period ?? 30;
  const color = urgencyColor(remaining, period);
  const progress = countdownProgress(remaining, period);

  return (
    <List.Item
      icon={{ source: Icon.Hourglass }}
      title="TOTP"
      accessories={[
        {
          text: { value: displayCode, color: Color.PrimaryText },
        },
        {
          icon: getProgressIcon(progress, color),
        },
      ]}
      actions={
        <ActionPanel>
          {totpCode ? (
            <>
              <Action
                title="Copy TOTP to Clipboard"
                onAction={() => copyPassword(totpCode)}
              />
              <Action
                title="Paste TOTP in Active App"
                onAction={() => pastePassword(totpCode)}
              />
            </>
          ) : null}
          <Action
            title="Refresh TOTP"
            icon={Icon.RotateClockwise}
            onAction={fetchOtp}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Entry"
            target={editTarget}
          />
        </ActionPanel>
      }
    />
  );
}
