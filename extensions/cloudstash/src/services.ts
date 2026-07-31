import { ServiceMap } from "effect";

export const AuthService = ServiceMap.Service<{
  readonly getApiKey: () => Promise<string>;
  readonly clearApiKey: () => Promise<void>;
}>("AuthService");

export const ClipboardService = ServiceMap.Service<{
  readonly readText: () => Promise<string | undefined>;
}>("ClipboardService");

export const HttpService = ServiceMap.Service<{
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
}>("HttpService");

export const HudService = ServiceMap.Service<{
  readonly show: (message: string) => Promise<void>;
}>("HudService");

export const ToastService = ServiceMap.Service<{
  readonly showFailure: (
    title: string,
    message?: string,
    primaryAction?: { title: string; onAction: () => void | Promise<void> },
  ) => Promise<void>;
}>("ToastService");

export const PreferencesService = ServiceMap.Service<{
  readonly serverUrl: string;
}>("PreferencesService");

export type AuthService = ServiceMap.Service.Identifier<typeof AuthService>;
export type ClipboardService = ServiceMap.Service.Identifier<typeof ClipboardService>;
export type HttpService = ServiceMap.Service.Identifier<typeof HttpService>;
export type HudService = ServiceMap.Service.Identifier<typeof HudService>;
export type ToastService = ServiceMap.Service.Identifier<typeof ToastService>;
export type PreferencesService = ServiceMap.Service.Identifier<typeof PreferencesService>;
