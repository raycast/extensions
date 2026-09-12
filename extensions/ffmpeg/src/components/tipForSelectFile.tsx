import { Detail } from "@raycast/api";

export function TipForSelectFile() {
  const content = `
# Welcome to FFmpeg

To use this plugin select the video file(s) you want to process in \`Finder\`. Then run FFmpeg.
`;

  return <Detail markdown={content} />;
}
