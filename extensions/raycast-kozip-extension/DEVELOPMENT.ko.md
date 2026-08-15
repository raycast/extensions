# Development Guide

[English](DEVELOPMENT.en.md) | 한국어

KoZip 확장 개발을 위한 종합 가이드입니다.

## 프로젝트 구조

```
src/
├── kz.tsx              # 메인 확장 로직
└── locales/            # 국제화
    ├── index.ts        # 로케일 유틸리티
    ├── ko.json         # 한국어 문자열
    └── en.json         # 영어 문자열
assets/
├── icon.png           # 확장 아이콘 (라이트 모드)
└── icon@dark.png      # 확장 아이콘 (다크 모드)
```

## 개발 환경 설정

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Raycast 앱 설치

### 설정 단계
```bash
# 저장소 클론
git clone https://github.com/kyungw00k/raycast-kozip-extension.git
cd raycast-kozip-extension

# 의존성 설치
npm install

# 개발 모드 시작
npm run dev
```

## 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 핫 리로드로 개발 시작 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 실행 |
| `npm run fix-lint` | 린트 이슈 자동 수정 |
| `npm run publish` | Raycast Store에 게시 |

## 아키텍처

### 주요 컴포넌트

#### Command()
- 메인 검색 인터페이스 컴포넌트
- 검색 텍스트 디바운싱 (500ms)
- 캐시 관리 및 API 호출 제어

#### SearchListItem()
- 개별 주소 결과 렌더링
- 도로명/지번 주소 전환 기능
- 액션 패널 (복사, 지도 연결)

#### getLocalizedStrings()
- 동적 로케일 로딩
- fallback 메커니즘 (한국어 → 영어)
- 런타임 로케일 감지

#### parseFetchResponse()
- API 응답 파싱 및 변환
- 에러 처리
- 주소 형식 정규화

### 상태 관리

```typescript
// 검색 관련 상태
const [searchText, setSearchText] = useState("");
const [debouncedSearchText, setDebouncedSearchText] = useState("");

// UI 상태
const [showJibunAddress, setShowJibunAddress] = useState(false);

// 캐시 상태
const [cachedData, setCachedData] = useState<AddressResult[] | null>(null);
```

## API 통합

### Postcodify API
- **엔드포인트**: `https://api.poesis.kr/post/search.php`
- **파라미터**: `q` (검색어, NFC 정규화)
- **응답**: JSON 형태의 주소 배열

### 요청 플로우
1. 검색어 입력 → 디바운싱 (500ms)
2. 캐시 확인 (24시간 TTL)
3. 캐시 미스 시 API 호출
4. 응답 파싱 및 캐시 저장
5. UI 업데이트

## 캐시 시스템

### 캐시 전략
```typescript
interface CacheEntry {
  data: AddressResult[];
  timestamp: number;
  expiresAt: number;
}

// 캐시 키: 정규화된 검색어 (소문자)
const cacheKey = searchText.normalize("NFC").toLowerCase();
```

### 캐시 관리
- **TTL**: 24시간
- **저장소**: Raycast LocalStorage
- **정리**: 자동 만료 확인

## 국제화 (i18n)

### 지원 언어
- 한국어 (`ko.json`)
- 영어 (`en.json`)

### 새 언어 추가

1. 새 로케일 파일 생성:
```bash
cp src/locales/en.json src/locales/ja.json
```

2. 문자열 번역:
```json
{
  "searchPlaceholder": "韓国の住所を検索...",
  "resultsTitle": "検索結果",
  "copyKoreanAddress": "韓国住所をコピー",
  "copyEnglishAddress": "英語住所をコピー",
  "noAddressInfo": "住所情報なし"
}
```

3. 자동 감지 및 로드 (코드 변경 불필요)

### 로케일 fallback
```
사용자 로케일 → 한국어 → 영어 → 기본값
```

## 타입 정의

### AddressResult
```typescript
interface AddressResult {
  id: string;
  postcode5: string;           // 5자리 우편번호
  postcode6: string;           // 6자리 우편번호
  ko_doro: string;             // 한국어 도로명
  ko_jibeon: string;           // 한국어 지번
  en_doro: string;             // 영어 도로명
  en_jibeon: string;           // 영어 지번
  full_ko_doro: string;        // 전체 한국어 도로명 주소
  full_ko_jibeon: string;      // 전체 한국어 지번 주소
  full_en_doro: string;        // 전체 영어 도로명 주소
  full_en_jibeon: string;      // 전체 영어 지번 주소
  full_ko_doro_with_postal: string;    // 우편번호 포함 한국어 도로명
  full_ko_jibeon_with_postal: string;  // 우편번호 포함 한국어 지번
  full_en_doro_with_postal: string;    // 우편번호 포함 영어 도로명
  full_en_jibeon_with_postal: string;  // 우편번호 포함 영어 지번
  building_name?: string;      // 건물명 (선택사항)
}
```

## 테스트

### 수동 테스트 시나리오
1. **기본 검색**: "강남역" 검색
2. **건물명 검색**: "롯데타워" 검색
3. **우편번호 검색**: "06292" 검색
4. **영어 검색**: "Seoul" 검색
5. **캐시 테스트**: 동일 검색어 반복
6. **주소 전환**: 도로명 ↔ 지번 전환
7. **복사 기능**: 다양한 형식 복사
8. **지도 연동**: 카카오맵/네이버 지도 열기

### 성능 테스트
- 검색 응답 시간 < 2초
- 캐시 히트 응답 시간 < 100ms
- 메모리 사용량 모니터링

## 코딩 표준

### TypeScript 설정
```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### ESLint 규칙
- Raycast 확장 권장 설정
- React Hooks 규칙
- TypeScript 엄격 모드

### 코드 스타일
- Prettier 자동 포맷팅
- 2칸 들여쓰기
- 세미콜론 필수
- 단일 따옴표 선호

## 빌드 및 배포

### 로컬 빌드
```bash
npm run build
```

### 스토어 게시
```bash
npm run publish
```

### 버전 관리
- [Semantic Versioning](https://semver.org/) 준수
- `package.json`에서 버전 업데이트
- Git 태그로 릴리스 표시

## 문제 해결

### 일반적인 문제

#### 캐시 문제
```bash
# Raycast 캐시 클리어
rm -rf ~/Library/Caches/com.raycast.macos
```

#### 개발 모드 이슈
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### API 응답 오류
- 네트워크 연결 확인
- API 엔드포인트 상태 확인
- 검색어 인코딩 확인

### 디버깅

#### 로그 확인
```javascript
console.log("Search query:", debouncedSearchText);
console.log("API response:", data);
console.log("Cache hit:", cachedData !== null);
```

#### 개발자 도구
- Raycast 개발자 모드 활성화
- 확장 리로드: `⌘ + R`
- 개발자 콘솔 열기

## 기여 가이드

### Pull Request 프로세스
1. 기능 브랜치 생성
2. 코드 변경 및 테스트
3. 린트 및 포맷팅 확인
4. 커밋 메시지 작성 (Conventional Commits)
5. PR 생성 및 리뷰 요청

### 커밋 메시지 형식
```
type(scope): description

body

footer
```

예시:
```
feat(search): add building name display in results

- Show building names in subtitle when available
- Improve address information visibility
- Maintain backward compatibility

Closes #123
```

## 리소스

- [Raycast API 문서](https://developers.raycast.com/api-reference)
- [Postcodify API 문서](https://postcodify.poesis.kr/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [React Hooks 가이드](https://reactjs.org/docs/hooks-intro.html)