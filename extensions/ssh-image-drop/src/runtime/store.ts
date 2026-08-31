import { LocalStorage } from "@raycast/api";
import { AuthMode } from "../lib/transferArgs";
import { RECENTS_CAP } from "../lib/mergeHosts";

const RECENTS_KEY = "recents";
const AUTH_KEY = "authMode";
const PENDING_SELECTION_KEY = "pendingSelection";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // 컨테이너 형태가 fallback과 다르면(저장소 변조·버전 스큐) fallback — 이후 map[x]/.filter 크래시 방지
    if (parsed === null || Array.isArray(parsed) !== Array.isArray(fallback))
      return fallback;
    if (typeof parsed !== typeof fallback) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export async function getRecents(): Promise<string[]> {
  return readJson<string[]>(RECENTS_KEY, []);
}

export async function addRecent(host: string): Promise<void> {
  const next = [host, ...(await getRecents()).filter((h) => h !== host)].slice(
    0,
    RECENTS_CAP,
  );
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export async function getAuthMode(host: string): Promise<AuthMode> {
  const map = await readJson<Record<string, string>>(AUTH_KEY, {});
  // 손상·구버전 값 방어: "keychain" 외 전부 key — 임의 값이 "BatchMode도 askpass도 없는" hang 조합을 만드는 것 방지
  return map[host] === "keychain" ? "keychain" : "key";
}

export async function setAuthMode(
  alias: string,
  mode: AuthMode,
): Promise<void> {
  const map = await readJson<Record<string, AuthMode>>(AUTH_KEY, {});
  map[alias] = mode;
  await LocalStorage.setItem(AUTH_KEY, JSON.stringify(map));
}

/** 서버 삭제 시 LocalStorage 잔재 정리 — authMode 항목·recents 항목 제거 (config·Keychain 삭제는 별도) */
export async function forgetHost(alias: string): Promise<void> {
  const map = await readJson<Record<string, AuthMode>>(AUTH_KEY, {});
  if (alias in map) {
    delete map[alias];
    await LocalStorage.setItem(AUTH_KEY, JSON.stringify(map));
  }
  const recents = await getRecents();
  if (recents.includes(alias)) {
    await LocalStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(recents.filter((h) => h !== alias)),
    );
  }
}

/**
 * 셀렉터 위임용 선택 텍스트 핸드오프. launchContext로 넘기지 않는 이유는 그것이 **비신뢰
 * 입력**이기 때문이다 — 조작된 raycast:// 딥링크가 같은 payload로 셀렉터를 열면 공격자
 * 문자열이 "내가 지정한 텍스트"인 양 원격 클립보드로 나간다(HUD 라벨이 오히려 신뢰를 보강한다).
 * LocalStorage는 확장 자신만 쓸 수 있어 딥링크로는 세울 수 없다.
 *
 * 소비는 1회성 — 읽는 즉시 지운다. 남겨두면 다음 실행이 stale 선택을 보낸다.
 */
export async function putPendingSelection(text: string): Promise<void> {
  await LocalStorage.setItem(PENDING_SELECTION_KEY, text);
}

/** 핸드오프 소비 — 없으면 null. 읽는 즉시 삭제하며, 삭제 실패는 무시(값은 이미 손에 있다) */
export async function takePendingSelection(): Promise<string | null> {
  const raw = await LocalStorage.getItem<string>(PENDING_SELECTION_KEY);
  await LocalStorage.removeItem(PENDING_SELECTION_KEY).catch(() => undefined);
  return typeof raw === "string" ? raw : null;
}
