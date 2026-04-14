# macOS Native API 활용

Raycast는 Node.js 기반이지만, `child_process`나 `useExec`를 통해 macOS 네이티브 API를 호출할 수 있다. 별도 설치 없이 macOS에 내장된 프레임워크를 활용하는 패턴 정리.

---

## 브릿지 패턴

Node.js에서 네이티브 API를 호출하는 두 가지 방식:

### 1. Swift 스크립트 직접 실행

```tsx
import { execSync } from "child_process";

const script = `
import Foundation
// Swift 코드
print("result")
`;
const result = execSync(`swift -e '${script}'`).toString();
```

### 2. 미리 컴파일된 Swift 바이너리 (권장)

```
assets/
  ocr-helper           # 컴파일된 Swift 바이너리
```

```tsx
import { execSync } from "child_process";
import { environment } from "@raycast/api";
import path from "path";

const binary = path.join(environment.assetsPath, "ocr-helper");
const result = execSync(`"${binary}" "${imagePath}"`).toString();
```

> Swift 스크립트 직접 실행은 초기 컴파일 오버헤드가 있어, 반복 호출 시 바이너리 권장.

---

## Vision Framework (OCR / 이미지 분석)

macOS 10.15+ 내장. 별도 설치/API 키 불필요.

### 주요 API

| 기능 | API | 설명 |
|------|-----|------|
| OCR (텍스트 인식) | `VNRecognizeTextRequest` | 이미지에서 텍스트 추출 |
| 바코드/QR 인식 | `VNDetectBarcodesRequest` | 바코드/QR 코드 감지 |
| 얼굴 감지 | `VNDetectFaceRectanglesRequest` | 얼굴 위치 탐지 |
| 이미지 분류 | `VNClassifyImageRequest` | 이미지 카테고리 분류 |
| 물체 추적 | `VNTrackObjectRequest` | 비디오에서 물체 추적 |
| 텍스트 영역 감지 | `VNDetectTextRectanglesRequest` | 텍스트 위치 탐지 |

### OCR 예제: 스크린캡쳐 + 텍스트 추출

전체 플로우:

```
screencapture -i (영역 선택)
       ↓
  이미지 파일 저장
       ↓
  Swift/Vision API로 OCR
       ↓
  추출된 텍스트 반환
```

#### Swift OCR 스크립트

```swift
import Vision
import AppKit

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let image = NSImage(contentsOf: url)!
let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ko", "en", "ja", "zh-Hans"]

let handler = VNImageRequestHandler(cgImage: cgImage)
try handler.perform([request])

let results = request.results ?? []
for observation in results {
    if let text = observation.topCandidates(1).first?.string {
        print(text)
    }
}
```

#### Raycast 커맨드에서 호출

```tsx
import { showHUD, Clipboard } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";
import os from "os";
import { environment } from "@raycast/api";

export default async function Command() {
  const imgPath = path.join(os.tmpdir(), `capture-${Date.now()}.png`);

  // 1. 화면 영역 캡쳐
  try {
    execSync(`screencapture -i "${imgPath}"`);
  } catch {
    await showHUD("Capture cancelled");
    return;
  }

  // 2. Vision OCR로 텍스트 추출
  const binary = path.join(environment.assetsPath, "ocr-helper");
  const text = execSync(`"${binary}" "${imgPath}"`).toString().trim();

  // 3. 결과 활용
  await Clipboard.copy(text);
  await showHUD("Text copied!");
}
```

### OCR 지원 언어 (주요)

`ko`, `en`, `ja`, `zh-Hans`, `zh-Hant`, `fr`, `de`, `es`, `pt`, `it`, `ru` 등

---

## screencapture (화면 캡쳐)

macOS 내장 CLI.

### 주요 옵션

| 플래그 | 동작 |
|--------|------|
| `-x` | 소리 없이 전체 화면 |
| `-i` | 사용자가 영역 선택 |
| `-c` | 파일 대신 클립보드로 |
| `-w` | 윈도우 선택 모드 |
| `-R x,y,w,h` | 지정 좌표/크기 영역 |
| `-T seconds` | 지연 캡쳐 |
| `-t format` | 포맷 지정 (png, jpg, pdf 등) |

### 사용 예

```tsx
import { execSync } from "child_process";

// 전체 화면 (소리 없이)
execSync('screencapture -x /tmp/full.png');

// 영역 선택
execSync('screencapture -i /tmp/region.png');

// 클립보드로
execSync('screencapture -ic');

// 특정 영역
execSync('screencapture -R 0,0,800,600 /tmp/area.png');
```

---

## 기타 활용 가능한 macOS 내장 도구

### say (텍스트 음성 변환)

```tsx
execSync('say -v Yuna "안녕하세요"');  // 한국어 TTS
```

### osascript (AppleScript / JXA)

시스템 자동화, 앱 제어, 다이얼로그 등.

```tsx
// 현재 Finder 경로
const dir = execSync('osascript -e \'tell app "Finder" to get POSIX path of (insertion location as text)\'').toString();

// 알림 표시
execSync('osascript -e \'display notification "Done!" with title "My Extension"\'');
```

### mdls (Spotlight 메타데이터)

```tsx
// 파일 메타데이터 조회
const meta = execSync('mdls "/path/to/file.jpg"').toString();
```

### mdfind (Spotlight 검색)

```tsx
// 파일 검색
const files = execSync('mdfind "kMDItemKind == \'PDF Document\'"').toString();
```

### open (URL/파일 열기)

> Raycast API의 `open()` 함수로도 가능하지만 CLI도 사용 가능.

```tsx
execSync('open -a "Visual Studio Code" /path/to/project');
```

### pbcopy / pbpaste (클립보드)

> Raycast API의 `Clipboard`로도 가능하지만 파이프 조합 시 유용.

```tsx
execSync('echo "hello" | pbcopy');
const text = execSync('pbpaste').toString();
```
