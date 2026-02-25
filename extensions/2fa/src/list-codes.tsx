import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const TOTP_PERIOD = 30;

import { existsSync } from "fs";

const COMMON_PATHS = [
  "/opt/homebrew/bin/2fa",
  "/usr/local/bin/2fa",
  "/usr/bin/2fa",
  `${process.env.HOME}/go/bin/2fa`,
];

async function getTfaPath(): Promise<string> {
  // Check common paths first
  for (const path of COMMON_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to which
  try {
    const { stdout } = await execFileAsync("/usr/bin/which", ["2fa"]);
    const path = stdout.trim();
    if (path && existsSync(path)) {
      return path;
    }
  } catch {
    // Ignore which errors
  }

  throw new Error(
    "2fa CLI not found. Please install it first: go install rsc.io/2fa@latest",
  );
}

interface TwoFAAccount {
  name: string;
  code: string;
}

function getSecondsRemaining(): number {
  return TOTP_PERIOD - (Math.floor(Date.now() / 1000) % TOTP_PERIOD);
}

function getTimerColor(seconds: number): Color {
  if (seconds <= 5) return Color.Red;
  if (seconds <= 10) return Color.Orange;
  if (seconds <= 15) return Color.Yellow;
  return Color.Green;
}

function getTimerIcon(seconds: number): Icon {
  const ratio = seconds / TOTP_PERIOD;
  if (ratio > 0.75) return Icon.CircleProgress100;
  if (ratio > 0.5) return Icon.CircleProgress75;
  if (ratio > 0.25) return Icon.CircleProgress50;
  return Icon.CircleProgress25;
}

function getAccountIcon(name: string): { source: Icon; tintColor: Color } {
  const colors = [
    Color.Blue,
    Color.Green,
    Color.Magenta,
    Color.Orange,
    Color.Purple,
    Color.Red,
    Color.Yellow,
  ];
  const icons = [
    Icon.Key,
    Icon.Lock,
    Icon.Shield,
    Icon.Fingerprint,
    Icon.PersonCircle,
  ];

  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    source: icons[hash % icons.length],
    tintColor: colors[hash % colors.length],
  };
}

async function getAccounts(): Promise<TwoFAAccount[]> {
  const tfaPath = await getTfaPath();
  const { stdout } = await execFileAsync(tfaPath, []);
  const trimmed = stdout.trim();

  if (!trimmed) {
    return [];
  }

  const lines = trimmed.split("\n");

  return lines.map((line) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return { code: match[1], name: match[2] };
    }
    return { code: "", name: line };
  });
}

async function getCodeForAccount(name: string): Promise<string> {
  const tfaPath = await getTfaPath();
  const { stdout } = await execFileAsync(tfaPath, [name]);
  return stdout.trim();
}

function formatCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  if (code.length === 7) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  if (code.length === 8) {
    return `${code.slice(0, 4)} ${code.slice(4)}`;
  }
  return code;
}

export default function Command() {
  const [accounts, setAccounts] = useState<TwoFAAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(
    getSecondsRemaining(),
  );

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getAccounts();
      setAccounts(result);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load 2FA accounts",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSeconds = getSecondsRemaining();
      setSecondsRemaining(newSeconds);

      // Auto-refresh codes when timer resets
      if (newSeconds === TOTP_PERIOD) {
        loadAccounts();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loadAccounts]);

  const timerDisplay = useMemo(() => {
    const color = getTimerColor(secondsRemaining);
    const icon = getTimerIcon(secondsRemaining);
    return { color, icon, text: `${secondsRemaining}s` };
  }, [secondsRemaining]);

  const copyCode = async (account: TwoFAAccount) => {
    try {
      const freshCode = await getCodeForAccount(account.name);
      await Clipboard.copy(freshCode);
      await closeMainWindow();
      await showHUD(`🔐 Copied ${account.name}`);
      await popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy code",
        message: String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search 2FA accounts...">
      {!isLoading && accounts.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No 2FA Accounts Found"
          description="Add your first account using the 'Add 2FA Account' command or run '2fa -add <name>' in terminal."
        />
      ) : (
        <List.Section
          title="2FA Codes"
          subtitle={`Refreshing in ${secondsRemaining}s`}
        >
          {accounts.map((account) => {
            const accountIcon = getAccountIcon(account.name);
            return (
              <List.Item
                key={account.name}
                icon={accountIcon}
                title={account.name}
                subtitle={formatCode(account.code)}
                accessories={[
                  {
                    tag: {
                      value: formatCode(account.code),
                      color: Color.PrimaryText,
                    },
                  },
                  {
                    tag: {
                      value: timerDisplay.text,
                      color: timerDisplay.color,
                    },
                    icon: {
                      source: timerDisplay.icon,
                      tintColor: timerDisplay.color,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Copy Code"
                      icon={{
                        source: Icon.CopyClipboard,
                        tintColor: Color.Green,
                      }}
                      onAction={() => copyCode(account)}
                    />
                    <Action
                      title="Refresh Codes"
                      icon={{
                        source: Icon.ArrowClockwise,
                        tintColor: Color.Blue,
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadAccounts}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
