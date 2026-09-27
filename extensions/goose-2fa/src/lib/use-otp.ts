import { useEffect, useState } from "react";
import { generateHOTP, generateTOTP } from "../../vendor/lib/otp";
import type { AccountData } from "../../vendor/lib/types";

export interface OtpCode {
  code: string;
  /** TOTP 剩余秒数；HOTP 为 -1（计数器驱动）。 */
  remaining: number;
}

function useClockSeconds(): number {
  const [seconds, setSeconds] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

/** 为列表里所有账户计算动态码；TOTP 每秒跟随时间重算，HOTP 跟随计数器。 */
export function useOtpCodes(accounts: AccountData[]): Record<string, OtpCode> {
  const now = useClockSeconds();
  const [codes, setCodes] = useState<Record<string, OtpCode>>({});
  const signature = accounts
    .map((account) => [account.id, account.type, account.counter, account.period, account.digits, account.algorithm].join(":"))
    .join("|");

  useEffect(() => {
    let active = true;
    void (async () => {
      const next: Record<string, OtpCode> = {};
      for (const account of accounts) {
        try {
          if (account.type === "hotp") {
            next[account.id] = {
              code: await generateHOTP(account.secret, account.counter, account.digits, account.algorithm),
              remaining: -1,
            };
            continue;
          }
          const period = account.period || 30;
          const result = await generateTOTP(account.secret, period, account.digits, account.algorithm);
          next[account.id] = { code: result.code, remaining: result.remaining };
        } catch {
          next[account.id] = { code: "ERROR", remaining: -1 };
        }
      }
      if (active) setCodes(next);
    })();
    return () => {
      active = false;
    };
    // signature 覆盖账户集合与计数器变化，now 负责 TOTP 的时间推进
  }, [signature, now]);

  return codes;
}
