import { Clipboard, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { Effect } from "effect";

import { DEFAULT_SERVER_URL } from "./constants";
import { getApiKey, clearApiKey } from "./oauth";
import { AuthService, ClipboardService, HttpService, HudService, PreferencesService, ToastService } from "./services";

export const provideLive = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    AuthService | ClipboardService | HttpService | HudService | ToastService | PreferencesService
  >,
): Effect.Effect<A, E> =>
  effect.pipe(
    Effect.provideService(AuthService, { getApiKey, clearApiKey }),
    Effect.provideService(ClipboardService, {
      readText: () => Clipboard.readText(),
    }),
    Effect.provideService(HttpService, { fetch: globalThis.fetch }),
    Effect.provideService(HudService, { show: showHUD }),
    Effect.provideService(ToastService, {
      showFailure: async (title, message, primaryAction) => {
        await showToast({
          style: Toast.Style.Failure,
          title,
          message,
          primaryAction: primaryAction
            ? {
                title: primaryAction.title,
                onAction: async () => {
                  await primaryAction.onAction();
                },
              }
            : undefined,
        });
      },
    }),
    Effect.provideService(PreferencesService, {
      serverUrl: getPreferenceValues<ExtensionPreferences>().serverUrl || DEFAULT_SERVER_URL,
    }),
  );
