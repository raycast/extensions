import { useEffect, useMemo, useState } from "react";
import { getTotp } from "./pass-cli";
import { generateTotp, getTotpPeriod, parseOtpauthUri } from "./totp";
import { Item, ItemDetail } from "./types";

/** A 2FA code, with the seconds it stays valid when its period is known. */
export interface DisplayedCode {
  code: string;
  remainingSeconds?: number;
}

/** The current 2FA code, generated locally from the otpauth URI when possible. */
export async function getCurrentTotpCode(item: Item, detail?: ItemDetail): Promise<string> {
  const params = detail?.totpUri ? parseOtpauthUri(detail.totpUri) : undefined;
  return params ? generateTotp(params).code : getTotp(item.shareId, item.itemId);
}

/** 2FA code of the item shown in the details panel; `failed` when pass-cli couldn't provide it. */
export interface TotpState {
  code?: DisplayedCode;
  failed: boolean;
}

/** Live TOTP code for the item shown in the detail panel, generated locally from its otpauth URI when possible. */
export function useTotpCode(item: Item, detail: ItemDetail | undefined): TotpState {
  const params = useMemo(() => (detail?.totpUri ? parseOtpauthUri(detail.totpUri) : undefined), [detail?.totpUri]);
  const isEnabled = item.hasTotp && detail !== undefined;
  const [now, setNow] = useState(() => Date.now());
  // What pass-cli returned, for the details and the period it was asked for: a refresh never shows the previous code.
  const [cliResult, setCliResult] = useState<{ detail: ItemDetail; step: number; code?: string }>();

  useEffect(() => {
    if (!isEnabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isEnabled]);

  // Codes that can't be generated locally come from pass-cli: refreshed every period when the URI is
  // time-based, fetched once otherwise (counter-based codes have no lifetime to count down).
  const period = params?.period ?? (detail?.totpUri ? getTotpPeriod(detail.totpUri) : undefined);
  const step = period ? Math.floor(now / 1000 / period) : 0;

  useEffect(() => {
    if (!item.hasTotp || !detail || params) return;
    let cancelled = false;
    getTotp(item.shareId, item.itemId).then(
      (code) => {
        if (!cancelled) setCliResult({ detail, step, code });
      },
      () => {
        if (!cancelled) setCliResult({ detail, step });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [item.hasTotp, detail, params, step, item.shareId, item.itemId]);

  if (!isEnabled) return { failed: false };
  if (params) return { code: generateTotp(params, now), failed: false };
  const result = cliResult?.detail === detail && cliResult.step === step ? cliResult : undefined;
  if (!result) return { failed: false };
  if (!result.code) return { failed: true };
  const code: DisplayedCode = period
    ? { code: result.code, remainingSeconds: period - (Math.floor(now / 1000) % period) }
    : { code: result.code };
  return { code, failed: false };
}
