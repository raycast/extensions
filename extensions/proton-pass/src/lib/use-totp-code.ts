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

/** Live TOTP code for the item shown in the detail panel, generated locally from its otpauth URI when possible. */
export function useTotpCode(item: Item, detail: ItemDetail | undefined): DisplayedCode | undefined {
  const params = useMemo(() => (detail?.totpUri ? parseOtpauthUri(detail.totpUri) : undefined), [detail?.totpUri]);
  const isEnabled = item.hasTotp && detail !== undefined;
  const [now, setNow] = useState(() => Date.now());
  const [cliCode, setCliCode] = useState<{ step: number; code: string }>();

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
    if (!isEnabled || params) return;
    let cancelled = false;
    getTotp(item.shareId, item.itemId).then(
      (code) => {
        if (!cancelled) setCliCode({ step, code });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [isEnabled, params, step, item.shareId, item.itemId]);

  if (!isEnabled) return undefined;
  if (params) return generateTotp(params, now);
  if (cliCode?.step !== step) return undefined;
  return period
    ? { code: cliCode.code, remainingSeconds: period - (Math.floor(now / 1000) % period) }
    : { code: cliCode.code };
}
