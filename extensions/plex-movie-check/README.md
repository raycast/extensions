# Plex Movie Check (Raycast)

`plex_movie_check.py`의 로직을 Raycast 확장으로 옮긴 버전입니다.

## 기능

- Plex의 `movie` 섹션 자동 탐색
- 제목 검색(`substring` 기본, `exact` 옵션 지원)
- 연도 필터 지원
- 검색 API 결과가 없으면 섹션 전체를 페이지네이션으로 스캔하는 fallback

## 설정

Raycast에서 이 확장을 Import한 뒤 Preferences에 아래 값을 입력하세요.

- `Plex Base URL`: 예) `http://127.0.0.1:32400`
- `Plex Token`: Plex API token
- `Default Exact Title` (선택): 기본 exact 검색 여부

## 사용

1. Raycast에서 `Search Plex Movie` 실행
2. `Movie Title` 입력
3. 필요하면 `Year` 입력 및 `Exact Title` 체크
4. 결과 목록에서 섹션/`ratingKey` 확인

## 로컬 개발

```bash
npm install
npm run dev
```

빌드:

```bash
npm run build
```
