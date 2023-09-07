import { Detail } from "@raycast/api";

export function TipForSelectFile() {
  const content = `# FFmpeg Tip - Please Select File(s)

- Before you run this plugin, please first navigate to \`Finder\` and select the video file(s) you want to process. 
- You can select multiple video files at the same time. 
- Once you have made your selection, proceed with running this plugin.`;

  return <Detail markdown={content} />;
}
