## Golden Rule

- 코드를 수정하기 전에 **반드시 해당 파일을 먼저 읽는다**. 읽지 않은 파일을 수정하지 않는다.

## Commands

```bash
bun run dev              # 개발 서버 (ray develop)
bun run build            # 프로덕션 빌드 (ray build)
bun run lint             # ESLint + Prettier 검사 (ray lint)
bun run fix-lint         # ESLint + Prettier 자동 수정 (ray lint --fix)
bunx tsc --noEmit        # 타입 체크
bun run check-update     # 의존성 업데이트 확인 (npm-check-updates)
bun run syncpack:format  # package.json 필드 정렬
bun run publish          # Raycast Store 배포
```

## Verification

코드 수정 후 반드시 실행하고, 실패 시 수정:

1. `bun run fix-lint` — ESLint + Prettier 자동 수정 우선 실행
2. `bun run lint` — 자동 수정 후 남은 warning/error 확인, 있으면 수동 수정
3. `bunx tsc --noEmit` — 타입 체크

## Project Structure

```
src/
├── ai.ts                 # AI provider 생성 및 streamLLM 헬퍼. 시스템 프롬프트 빌더
├── types.ts              # 공유 타입 (Provider, ModelPreset, CustomPrompt, CommandConfig)
├── storage.ts            # Raycast LocalStorage CRUD (model presets, custom prompts, config)
├── defaults.ts           # 최초 실행 시 기본 프리셋/프롬프트 시딩
├── components/
│   ├── result-view.tsx   # LLM 스트리밍 결과 표시 공통 컴포넌트
│   ├── model-preset-form.tsx
│   └── custom-prompt-form.tsx
├── hooks/
│   ├── use-llm.ts        # LLM 스트리밍 호출 훅
│   └── use-selected-text.ts  # 선택된 텍스트 가져오기 훅
└── *.tsx                 # Raycast command 엔트리포인트 (package.json commands와 1:1 매핑)
```

## Architecture

- **Multi-provider AI**: Vercel AI SDK (`ai`) 기반. OpenAI, Anthropic, Google, Ollama 4개 provider 지원. `ai.ts`에서 provider별 클라이언트 생성
- **Data**: Raycast `LocalStorage`로 모델 프리셋, 커스텀 프롬프트, 커맨드 설정 관리. DB 없음
- **Streaming**: `streamText()` → `use-llm` 훅 → `ResultView` 컴포넌트로 실시간 표시

## Tech Stack

| Category | Library | Priority | Note |
|----------|---------|----------|------|
| Framework | Raycast API | - | `@raycast/api`, `@raycast/utils` |
| AI | Vercel AI SDK | - | `ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `ollama-ai-provider-v2` |
| Utility | es-toolkit | 1 | 범용 유틸리티 (toss). lodash/underscore 사용 금지 |
| Korean Text | es-hangul | 2 | 한글 처리 — 초성 검색, 조사, 음절 분리 (toss) |
| Lint | Raycast (ESLint + Prettier) | - | `ray lint` / `ray lint --fix` |
| Git Hooks | Lefthook | - | 설정: `lefthook.yml` 참조 |
| Commit | Commitlint | - | Conventional Commits. 설정: `commitlint.config.mjs` 참조 |