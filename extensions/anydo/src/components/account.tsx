import {
  Action,
  ActionPanel,
  Alert,
  environment,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";

import { showToastNotification } from "../anydo/alarm";
import { clearAuth, getStoredTokens, makeClient } from "../anydo/auth";
import { t } from "../anydo/i18n";
import { lang } from "../anydo/prefs";
import type { AnyDoUser } from "../anydo/types";
import { errorMessage } from "./feedback";
import { SignInAction } from "./sign-in";
import { useAsync } from "./use-async";

interface AccountState {
  signedIn: boolean;
  user?: AnyDoUser;
  error?: string;
  expiresAt?: number;
}

/** Account panel — sign in/out, session info, alarm test and a shortcut to the settings. */
export function AccountView({ onChanged }: { onChanged?: () => void }) {
  const { data, isLoading, revalidate } = useAsync<AccountState>(async () => {
    const tokens = await getStoredTokens();
    if (!tokens) return { signedIn: false };
    try {
      const user = await makeClient().getUserInfo();
      return { signedIn: true, user, expiresAt: tokens.expires_at };
    } catch (error) {
      return {
        signedIn: true,
        error: errorMessage(error),
        expiresAt: tokens.expires_at,
      };
    }
  });

  async function signOut() {
    const confirmed = await confirmAlert({
      title: t("از Any.do خارج شوی؟", "Sign out of Any.do?"),
      message: t(
        "توکن ذخیره‌شده پاک می‌شود؛ داده‌های Any.do دست‌نخورده می‌ماند.",
        "The stored token is removed.",
      ),
      icon: Icon.Logout,
      primaryAction: {
        title: t("خروج", "Sign out"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearAuth();
    await showToast({
      style: Toast.Style.Success,
      title: t("خارج شدی", "Signed out"),
    });
    revalidate();
    onChanged?.();
  }

  async function testAlarm() {
    const shown = await showToastNotification(
      t("⏰ تست آلارم Any.do", "⏰ Any.do alarm test"),
      t(
        "اگر این پیام را می‌بینی، آلارم ویندوزی درست کار می‌کند",
        "If you can see this, the Windows alarm works",
      ),
    );
    await showToast(
      shown
        ? {
            style: Toast.Style.Success,
            title: t("نوتیف تست ارسال شد", "Test notification sent"),
          }
        : {
            style: Toast.Style.Failure,
            title: t("ارسال نوتیف ممکن نشد", "Could not send the notification"),
          },
    );
  }

  const actions = (
    <ActionPanel>
      <SignInAction onSignedIn={revalidate} />
      <Action
        title={t("تست آلارم ویندوزی", "Test Windows alarm")}
        icon={Icon.Bell}
        onAction={testAlarm}
      />
      <Action
        title={t("تنظیمات اکستنشن", "Extension settings")}
        icon={Icon.Gear}
        onAction={() =>
          open(
            `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}`,
          )
        }
      />
      <Action
        title={t("باز کردن Any.do", "Open Any.do")}
        icon={Icon.Globe}
        onAction={() => open("https://app.any.do/")}
      />
      <Action
        title={t("تازه‌سازی", "Refresh")}
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      <Action
        title={t("خروج از حساب", "Sign out")}
        icon={Icon.Logout}
        onAction={signOut}
      />
    </ActionPanel>
  );

  if (data && !data.signedIn) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title={t("به Any.do وارد نشده‌ای", "Not signed in to Any.do")}
          description={t(
            "یک‌بار وارد شو: مرورگر باز می‌شود، اتصال را تأیید می‌کنی و تمام.",
            "Sign in once — your browser opens, you approve, done.",
          )}
          actions={actions}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={t("حساب Any.do", "Any.do account")}
    >
      <List.Section title={t("حساب", "Account")}>
        <List.Item
          icon={Icon.Person}
          title={data?.user?.name ?? t("حساب Any.do", "Any.do account")}
          subtitle={
            data?.user?.email ??
            (data?.error
              ? `${t("مشکل نشست", "session issue")}: ${data.error}`
              : "…")
          }
          accessories={data?.user ? [{ text: data.user.timezone }] : []}
          actions={actions}
        />
      </List.Section>

      <List.Section title={t("نشست و آلارم", "Session & alarm")}>
        <List.Item
          icon={Icon.Clock}
          title={t("توکن دسترسی", "Access token")}
          subtitle={
            data?.expiresAt
              ? `${t("خودکار تمدید می‌شود · انقضا", "auto-renews · expires")} ${new Date(
                  data.expiresAt,
                ).toLocaleString("en-CA")}`
              : t("زمان انقضا ثبت نشده", "no expiry recorded")
          }
          actions={actions}
        />
        <List.Item
          icon={Icon.Bell}
          title={t("آلارم سررسید (پس‌زمینه)", "Due alerts (background)")}
          subtitle={t(
            "هر دقیقه چک می‌کند و در سررسید نوتیف ویندوزی می‌دهد",
            "Checks every minute and alerts when due",
          )}
          actions={actions}
        />
        <List.Item
          icon={Icon.Gear}
          title={t("تنظیمات", "Preferences")}
          subtitle={
            lang() === "en"
              ? "Language, date style, default list/time, alarm, Telegram…"
              : "زبان، نوع تاریخ، لیست و ساعت پیش‌فرض، آلارم، تلگرام…"
          }
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
