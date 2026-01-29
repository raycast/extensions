# Raycast Store 제출 가이드

## 1. 스크린샷 준비 (필수)

Raycast Store에서 스크린샷은 매우 중요합니다. 아래 화면들을 캡처하세요:

### 필요한 스크린샷

```
metadata/p360-1.png  - 메인 화면 (Decision Readiness 결과)
metadata/p360-2.png  - Oura 연결 화면 (OAuth 프롬프트)
metadata/p360-3.png  - 에러 처리 화면 (선택)
```

### 스크린샷 촬영 방법

1. **개발 모드 실행**
   ```bash
   cd p360-raycast
   npm run dev
   ```

2. **Raycast에서 테스트**
   - `⌘ + Space` → "Check Readiness" 입력
   - Oura 계정 연결 (처음 실행 시)

3. **스크린샷 캡처**
   - `⌘ + Shift + 5` → Raycast 창만 캡처
   - 또는 Raycast 내장 스크린샷: Extension 실행 중 `⌘ + S`

4. **스크린샷 저장 위치**
   ```bash
   mkdir -p metadata
   # 스크린샷을 metadata/ 폴더에 저장
   ```

### 좋은 스크린샷 팁

- **녹색 상태 (70+)** 를 보여주면 positive한 인상
- **테이블 데이터가 잘 보이도록** 스크롤 위치 조정
- **다크 모드** 권장 (대부분 Raycast 유저가 다크모드 사용)

---

## 2. 아이콘 확인

현재 아이콘이 placeholder입니다. 제대로 된 아이콘이 필요합니다:

```
assets/extension-icon.png  (512x512 권장)
assets/oura-icon.png       (현재 있음)
```

### 아이콘 제작 옵션

1. **직접 제작**: Figma, Sketch
2. **AI 생성**: Midjourney, DALL-E
3. **간단한 방법**: 이모지 기반 (🧠 또는 💚)

---

## 3. Store 제출 명령어

모든 준비가 완료되면:

```bash
cd p360-raycast

# 1. 린트 체크
npm run lint

# 2. 빌드 테스트
npm run build

# 3. Store 제출
npm run publish
# 또는
npx @raycast/api@latest publish
```

### 제출 시 필요한 정보

- **Raycast 계정**: https://raycast.com 에서 가입
- **Author 검증**: 처음 제출 시 이메일 인증 필요

---

## 4. 리뷰 프로세스

Raycast Store 리뷰는 보통 **2-5일** 소요됩니다.

### 리뷰 체크리스트

- [ ] README.md가 명확한가?
- [ ] 스크린샷이 있는가?
- [ ] OAuth 플로우가 작동하는가?
- [ ] 에러 핸들링이 되어 있는가?
- [ ] 개인정보 처리가 명시되어 있는가?

### 리젝션 사유 (피해야 할 것들)

- 스크린샷 없음
- 빈약한 설명
- 작동하지 않는 기능
- 보안 취약점

---

## 5. 제출 후 할 일

1. **승인 대기** (2-5일)
2. **승인 시 런칭 준비**
   - Product Hunt 초안 작성
   - Reddit 포스트 준비
   - Twitter/X 런칭 트윗 준비

---

## Quick Commands

```bash
# 개발 모드
npm run dev

# 린트 수정
npm run fix-lint

# 빌드
npm run build

# Store 제출
npm run publish
```
