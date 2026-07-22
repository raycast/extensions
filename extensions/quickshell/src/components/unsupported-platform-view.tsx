import { Detail } from "@raycast/api";

export default function UnsupportedPlatformView() {
  return (
    <Detail
      markdown={`# Unsupported platform

Quick Shell Raycast runs on **Windows** and **macOS**.

Install [Raycast](https://www.raycast.com/) on Windows or Mac, then open this extension again.`}
    />
  );
}
