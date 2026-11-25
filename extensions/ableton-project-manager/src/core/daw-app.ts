import { getApplications, getPreferenceValues, open, type Application } from "@raycast/api";
import { daw } from "@/daws";

// 偏好设置里选的 DAW 版本（存 bundle ID）。偏好项只在需要它的仓库的 package.json 里声明，所以这里自己写类型。
function preferredBundleId(): string | undefined {
  return getPreferenceValues<{ dawApp?: string }>().dawApp || undefined;
}

// 选的版本装着就用它；没选或没装时，用名字匹配到的第一个，保证总是明确指定一个应用。
export function pickDawApp(apps: Application[]): Application | null {
  const bundleId = preferredBundleId();
  const preferred = bundleId ? apps.find((app) => app.bundleId === bundleId) : undefined;
  return preferred ?? apps.find((app) => app.name.toLowerCase().includes(daw.appNameMatch)) ?? null;
}

// 新建项目、图标、打开项目都用它，几个入口用的是同一个应用。
export async function resolveDawApp(): Promise<Application | null> {
  return pickDawApp(await getApplications());
}

// 用解析出的应用打开项目或 Set。一个都没装时才交给系统（系统会报错）。
export async function openWithDaw(target: string): Promise<void> {
  await open(target, (await resolveDawApp()) ?? undefined);
}
