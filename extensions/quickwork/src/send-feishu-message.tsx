import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FeishuAuthState, readAuthState, writeAuthState } from "./lib/auth-state";
import { buildMessage, refreshFeishuUserAccessToken, sendFeishuTextByUser } from "./lib/feishu";

interface CommandPreferences {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuUserRefreshToken: string;
  feishuOAuthRedirectUri: string;
  feishuChatId: string;
}

interface SendFormValues {
  body: string;
  prefix?: string;
}

const REFRESH_SKEW_MS = 90 * 1000;
const LAST_PREFIX_KEY = "quickwork-last-prefix";

function isAccessTokenUsable(state: FeishuAuthState | undefined): boolean {
  if (!state) {
    return false;
  }
  return state.expiresAt > Date.now() + REFRESH_SKEW_MS;
}

async function resolveUserAccessToken(preferences: CommandPreferences): Promise<string> {
  const authState = await readAuthState();
  if (authState && isAccessTokenUsable(authState)) {
    return authState.accessToken;
  }

  const preferenceRefreshToken = preferences.feishuUserRefreshToken.trim();
  const refreshCandidates: string[] = [];
  const cachedRefreshToken = authState?.refreshToken;

  if (preferenceRefreshToken && !refreshCandidates.includes(preferenceRefreshToken)) {
    refreshCandidates.push(preferenceRefreshToken);
  }
  if (cachedRefreshToken && !refreshCandidates.includes(cachedRefreshToken)) {
    refreshCandidates.push(cachedRefreshToken);
  }

  const errors: string[] = [];
  for (const refreshToken of refreshCandidates) {
    try {
      const refreshed = await refreshFeishuUserAccessToken({
        appId: preferences.feishuAppId,
        appSecret: preferences.feishuAppSecret,
        refreshToken,
      });

      const nextState: FeishuAuthState = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: Date.now() + refreshed.expiresIn * 1000,
      };
      await writeAuthState(nextState);
      return nextState.accessToken;
    } catch (error) {
      errors.push((error as Error).message);
    }
  }

  if (errors.length === 0) {
    throw new Error("No refresh token available. Please configure feishuUserRefreshToken in extension preferences.");
  }

  throw new Error(`Failed to refresh Feishu user token. ${errors[errors.length - 1]}`);
}

async function forceRefreshWithPreferenceToken(preferences: CommandPreferences): Promise<string> {
  const refreshed = await refreshFeishuUserAccessToken({
    appId: preferences.feishuAppId,
    appSecret: preferences.feishuAppSecret,
    refreshToken: preferences.feishuUserRefreshToken,
  });

  const nextState: FeishuAuthState = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: Date.now() + refreshed.expiresIn * 1000,
  };
  await writeAuthState(nextState);
  return nextState.accessToken;
}

async function resolveMessagePrefix(inputPrefix?: string): Promise<string> {
  const cleanInputPrefix = (inputPrefix ?? "").trim();
  if (cleanInputPrefix) {
    await LocalStorage.setItem(LAST_PREFIX_KEY, cleanInputPrefix);
    return cleanInputPrefix;
  }

  const cachedPrefix = (await LocalStorage.getItem<string>(LAST_PREFIX_KEY))?.trim();
  if (cachedPrefix) {
    return cachedPrefix;
  }

  throw new Error("Category is empty. Please enter a category at least once.");
}

async function submitMessage(values: SendFormValues, preferences: CommandPreferences): Promise<void> {
  try {
    const body = values.body ?? "";
    const effectivePrefix = await resolveMessagePrefix(values.prefix);
    const message = buildMessage(body, effectivePrefix);
    let accessToken = await resolveUserAccessToken(preferences);

    await closeMainWindow();
    try {
      await sendFeishuTextByUser({
        userAccessToken: accessToken,
        chatId: preferences.feishuChatId,
        text: message,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes("99991679")) {
        throw error;
      }

      accessToken = await forceRefreshWithPreferenceToken(preferences);
      await sendFeishuTextByUser({
        userAccessToken: accessToken,
        chatId: preferences.feishuChatId,
        text: message,
      });
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Message sent",
      message: "Feishu group has received your user message.",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Send failed",
      message: (error as Error).message,
    });
  }
}

export default function Command() {
  const preferences = getPreferenceValues<CommandPreferences>();
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const cachedPrefix = (await LocalStorage.getItem<string>(LAST_PREFIX_KEY))?.trim() ?? "";
      if (isMounted) {
        setPrefix(cachedPrefix);
      }
    })().catch(() => {
      // Keep empty prefix as fallback; submit handler will try cache again.
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to Feishu"
            onSubmit={(values: SendFormValues) => submitMessage(values, preferences)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="body"
        title="Message"
        placeholder="Share an update, decision, blocker, or request."
        autoFocus
      />
      <Form.TextField
        id="prefix"
        title="Category"
        placeholder="Daily Update"
        value={prefix}
        onChange={setPrefix}
      />
    </Form>
  );
}
