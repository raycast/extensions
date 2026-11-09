import { Application, getApplications, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BUNDLE_ID } from "./cmarks";

export const APP_STORE_URL = "https://apps.apple.com/app/cmarks/id6813011637";
export const GITHUB_URL = "https://github.com/yuchanghyun/cmarks";

/** 설치된 cmarks. Raycast가 아는 앱 목록에서 번들 ID로 찾는다(GitHub 판·App Store 판 모두 같은 ID). */
export async function findCmarks(): Promise<Application | undefined> {
  const apps = await getApplications();
  return apps.find((app) => app.bundleId === BUNDLE_ID);
}

export async function isCmarksInstalled(): Promise<boolean> {
  return (await findCmarks()) !== undefined;
}

/** 파일·폴더를 cmarks로 연다. 미설치 등으로 실패하면 토스트로 알리고 false를 돌려준다. */
export async function openInCmarks(target: string): Promise<boolean> {
  try {
    await open(target, BUNDLE_ID);
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Could not open in cmarks" });
    return false;
  }
}

/** cmarks 앱 자체를 연다(워크스페이스가 없을 때). */
export async function launchCmarks(): Promise<void> {
  try {
    const app = await findCmarks();
    if (!app) throw new Error("cmarks is not installed");
    await open(app.path);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open cmarks" });
  }
}
