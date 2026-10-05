# DevKin Raycast 확장 프로그램

[English](./README.md)

Raycast에서 DevKin 도구를 바로 엽니다. 각 command는 DevKin macOS 앱의 해당
`devkin://` 딥링크를 실행합니다.

DevKin 앱 소개와 설치 방법은
[homebrew-devkin](https://github.com/lsh2613/homebrew-devkin)에서 확인할 수 있습니다.

## 요구 사항

- Raycast가 설치된 macOS
- URL 스킴 등록을 위해 한 번 이상 실행한 DevKin 앱

## Commands

- Byte Converter
- Length Converter
- Base Converter
- JSON Converter
- Base64 String Converter
- Base64 Image Converter
- JWT Converter
- SQL Formatter
- Text Diff
- Text Inspector
- Markdown Preview
- HTML Preview
- QR Code Converter
- Regex Tester
- Time Converter

## 로컬 실행

```sh
npm install
npm run dev
```

개발 명령이 실행 중이면 Raycast가 확장 프로그램을 인식합니다.
