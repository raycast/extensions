import { localBasename } from "./validate";

export interface FileStatLike {
  isFile(): boolean;
  isDirectory(): boolean;
}

/**
 * 일반 파일·디렉토리만 전송 대상 (디렉토리는 scp -r 재귀 업로드). FIFO·socket·device는 제외.
 * 심링크는 호출부가 statSync(follow)로 해석한 결과를 넘긴다 — 파일/폴더 심링크 모두 대상이 된다.
 */
export function isTransferable(stat: FileStatLike): boolean {
  return stat.isFile() || stat.isDirectory();
}

/**
 * 배치 내 동일 basename 충돌 제거. 같은 원격 경로(<dir>/<basename>)로 매핑되는 파일 중
 * 첫 항목만 kept, 나머지는 dropped. 전송하면 후행 scp가 선행을 덮어써 silent 손실·중복 성공
 * 오보고가 나므로, dropped는 전송 대상에서 빼고 skip으로 정직하게 보고한다.
 * (원격 경로 산정과 동일한 localBasename을 써야 실제 충돌과 일치한다 — 로컬 경로이므로 `\`도 처리)
 */
export function dedupeByBasename(paths: string[]): {
  kept: string[];
  dropped: string[];
} {
  const seen = new Set<string>();
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const p of paths) {
    const base = localBasename(p);
    if (seen.has(base)) dropped.push(p);
    else {
      seen.add(base);
      kept.push(p);
    }
  }
  return { kept, dropped };
}
