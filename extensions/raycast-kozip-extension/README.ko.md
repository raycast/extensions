# KoZip - Raycast용 한국 우편번호 검색

[English](README.md) | 한국어

Postcodify API를 사용하여 한국 주소를 검색하는 Raycast 확장입니다. 다양한 형식의 한국 주소를 빠르게 찾고 복사할 수 있습니다.

## 주요 기능

- 🔍 **빠른 한국 주소 검색** - 실시간으로 한국 주소 검색 결과 제공
- 📋 **다양한 복사 옵션** - 여러 형식으로 주소 복사 가능
- 🗺️ **지도 연동** - 카카오맵, 네이버 지도에서 위치 확인
- 🚀 **성능 최적화** - 지능형 캐싱으로 빠른 반복 검색

## 설치

1. [Raycast Store](https://raycast.com/store)에서 확장 설치
2. 또는 로컬 설치:
   ```bash
   git clone https://github.com/kyungw00k/raycast-kozip-extension.git
   cd raycast-kozip-extension
   npm install
   npm run dev
   ```

## 사용법

1. Raycast를 열고 `kz` 또는 "KoZip" 입력
2. 검색어 입력 (한국 주소, 건물명, 또는 우편번호)
3. 결과를 보고 키보드 단축키로 다양한 작업 수행:

### 키보드 단축키

- **Enter**: 한국 도로명 주소 (우편번호 포함) 복사
- **⌘ + C**: 영어 도로명 주소 (우편번호 포함) 복사
- **⌘ + T**: 도로명 주소와 지번 주소 전환
- **⌘ + O**: 카카오맵에서 열기
- **⌘ + ⇧ + O**: 네이버 지도에서 열기

## 주소 형식

확장에서 제공하는 다양한 주소 형식:

### 한국어 형식
- **도로명 주소**: `(12345) 서울특별시 강남구 테헤란로 123`
- **지번 주소**: `(12345) 서울특별시 강남구 역삼동 123-45`

### 영어 형식
- **도로명 주소**: `123 Teheran-ro, Gangnam-gu, Seoul (12345)`
- **지번 주소**: `123-45 Yeoksam-dong, Gangnam-gu, Seoul (12345)`

## 개발

자세한 개발 가이드는 [DEVELOPMENT.md](DEVELOPMENT.md)를 참조하세요.

### 빠른 시작
```bash
npm install
npm run dev
```

## 기여

1. 저장소를 fork
2. 기능 브랜치 생성: `git checkout -b feature/새기능`
3. 변경사항 작성 및 테스트 추가
4. 설명적인 커밋 메시지로 커밋
5. Push 후 Pull Request 생성

## 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조.

## 크레딧

- **API**: [Postcodify](https://postcodify.poesis.kr/) by Poesis
- **지도**: 카카오맵, 네이버 지도 연동
- **아이콘**: [한국 우정사업본부 엠블럼](https://ko.m.wikipedia.org/wiki/%ED%8C%8C%EC%9D%BC:Emblem_of_Korea_Post.svg)을 기반으로 제작
- **작성자**: [kyungw00k](https://github.com/kyungw00k)

## 지원

문제가 발생하거나 제안사항이 있으면:
1. 기존 [이슈](https://github.com/kyungw00k/raycast-kozip-extension/issues) 확인
2. 상세한 정보와 함께 새 이슈 생성
3. 기능 요청은 enhancement 라벨 사용

