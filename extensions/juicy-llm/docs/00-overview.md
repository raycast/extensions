# Raycast Extension API Overview

> `@raycast/api` v1.104.12 / `@raycast/utils` v2.2.3 기준

## 패키지 구조

| 패키지 | 역할 |
|--------|------|
| `@raycast/api` | 핵심 UI 컴포넌트, 시스템 API, 피드백, 네비게이션 등 |
| `@raycast/utils` | React hooks, OAuth 유틸리티, 헬퍼 함수 (`@raycast/api` peer dependency) |

## @raycast/api 제공 기능

### UI 컴포넌트
- **List** - 리스트 뷰 (검색, 필터링, 섹션, 디테일 사이드패널)
- **Grid** - 그리드 뷰 (이미지 중심 아이템, 다양한 aspect ratio)
- **Detail** - 상세 뷰 (CommonMark 렌더링, 메타데이터)
- **Form** - 폼 (텍스트, 비밀번호, 체크박스, 드롭다운, 날짜, 태그, 파일 등)
- **MenuBarExtra** - macOS 메뉴바 아이템 (백그라운드 리프레시 지원)
- **ActionPanel / Action** - 액션 메뉴 (빌트인 + 커스텀 액션)

### 시스템 API
- **Clipboard** - 클립보드 읽기/쓰기/붙여넣기/지우기
- **LocalStorage** - 영구 키-값 저장소
- **Cache** - LRU 디스크 캐시 (동기 CRUD)
- **Environment** - 런타임 환경 정보 (commandName, isDevelopment, canAccess 등)
- **Preferences** - 확장 설정값 접근

### 피드백
- **Toast** (showToast) - 비동기 작업 상태 알림 (Animated, Success, Failure)
- **HUD** (showHUD) - 간단한 확인 메시지
- **Alert** (confirmAlert) - 확인 대화상자

### 네비게이션 & 윈도우
- **popToRoot** - 루트 검색으로 돌아가기
- **closeMainWindow** - 메인 윈도우 닫기
- **clearSearchBar** - 검색바 초기화
- **useNavigation** - push/pop 네비게이션 훅

### AI
- **AI.ask** - 프롬프트 기반 AI 응답 (스트리밍 지원, 다양한 모델)

### 기타
- **Keyboard** - 단축키 정의 (Common shortcuts 포함)
- **OAuth** - PKCEClient 기반 OAuth 인증

## @raycast/utils 제공 기능

### React Hooks
| Hook | 용도 |
|------|------|
| `useFetch` | URL fetch + 캐싱 + 페이지네이션 |
| `useCachedPromise` | 비동기 함수 결과 캐싱 |
| `useCachedState` | 커맨드 간 상태 유지 (like useState) |
| `usePromise` | 비동기 함수 래핑 (캐시 없음) |
| `useForm` | 폼 밸리데이션 + 제출 관리 |
| `useExec` | 쉘 커맨드 실행 |
| `useSQL` | 로컬 SQL 데이터베이스 쿼리 |
| `useAI` | Raycast AI 호출 (React 컴포넌트용) |
| `useStreamJSON` | 대용량 JSON 스트리밍 |
| `useFrecencySorting` | 빈도+최근성 기반 정렬 |

### 유틸리티 함수
| 함수 | 용도 |
|------|------|
| `showFailureToast` | 에러 Toast 표시 |
| `getAvatarIcon` | 이니셜 기반 아바타 생성 |
| `getProgressIcon` | 진행률 아이콘 생성 |
| `getFavicon` | URL 기반 파비콘 가져오기 |

### OAuth
| 유틸리티 | 용도 |
|----------|------|
| `OAuthService` | OAuth 인증 서비스 (빌트인: GitHub, Linear, Google 등) |
| `withAccessToken` | HOC로 인증 래핑 |
| `getAccessToken` | 토큰 가져오기 |

## Command Mode

| Mode | 설명 |
|------|------|
| `view` | React UI를 렌더링하는 커맨드 (List, Grid, Detail, Form) |
| `no-view` | UI 없이 실행되는 커맨드 (스크립트성 작업) |
| `menu-bar` | macOS 메뉴바에 아이콘 표시 (MenuBarExtra) |

## 프로젝트 설정 (package.json)

```jsonc
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "commands": [
    {
      "name": "my-command",
      "title": "My Command",
      "description": "설명",
      "mode": "view"  // "view" | "no-view" | "menu-bar"
    }
  ],
  "dependencies": {
    "@raycast/api": "^1.104.12",
    "@raycast/utils": "^2.2.3"
  }
}
```

## 문서 구성

| 파일 | 내용 |
|------|------|
| [01-ui-components.md](./01-ui-components.md) | List, Grid, Detail, Form, MenuBarExtra |
| [02-actions.md](./02-actions.md) | Action, ActionPanel, 빌트인 액션 |
| [03-navigation-window.md](./03-navigation-window.md) | 네비게이션, 윈도우, 검색바 |
| [04-feedback.md](./04-feedback.md) | Toast, HUD, Alert |
| [05-data-apis.md](./05-data-apis.md) | Clipboard, Storage, Cache, Environment, Preferences |
| [06-ai-api.md](./06-ai-api.md) | AI API |
| [07-keyboard-oauth.md](./07-keyboard-oauth.md) | Keyboard, OAuth |
| [08-utils-hooks.md](./08-utils-hooks.md) | @raycast/utils React Hooks |
| [09-utils-functions.md](./09-utils-functions.md) | @raycast/utils 유틸리티 함수 |
| [10-native-apis.md](./10-native-apis.md) | macOS Native API 활용 (Vision OCR, screencapture 등) |
