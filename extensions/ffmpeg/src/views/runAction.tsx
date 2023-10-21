import { Action, ActionPanel, List, useNavigation, Icon } from "@raycast/api";
import { ReactNode } from "react";
import { fileManager, fileState$ } from "../managers/fileManager";
import { ActionType } from "../type/action";
import { FileType } from "../type/file";

interface Option {
  key: ActionType;
  title: string;
  execute?: () => void;
  pop?: boolean;
  descriptionMarkdown?: () => string;
  detail?: () => ReactNode;
  icon?: Icon;
}

const options: { title: string; list: Option[] }[] = [
  {
    title: "Convert to VideoLoop",
    list: [
      {
        icon: Icon.FilmStrip,
        key: ActionType.convertVideoLoop,
        title: "Convert VideoLoop",
        execute: fileManager.convert.videoloopmp4,
        detail: () => {
          const process = fileState$.process.use();
          const processing = fileState$.processing.use();
          const actionType = fileState$.latestAction.use();
          let content = "";
          if (processing) {
            content = `Processing: ${process} %`;
          } else if (process === 100 && actionType === ActionType.convertVideoLoop) {
            content = `Processed`;
          } else {
            content = `## Convert file to VideoLoop
            Press enter to start conversion.
            ------------------------------
            This process will create a .mp4-file without sound and place it in the same folder as the original, with "_videoloop" as a suffix. The file is encoded using x264 at around 4000kbps, scaling the short end to become 1080p. This uses the Very Slow preset in FFMPEG to maximize quality.
            `;
          }
          return <List.Item.Detail markdown={content} />;
        },
      },
    ],
  },
  {
    title: "Copy Info",
    list: [
      {
        icon: Icon.Clipboard,
        key: ActionType.copyVideoInfo,
        title: "Copy Video Info",
        execute: fileManager.copy.fileInfo,
        pop: true,
        descriptionMarkdown: () => `## Copy file info to clipboard.
    
Example:
\`\`\`
${fileManager.getFileInfoMarkdown()}
\`\`\`
        `,
      },
      {
        icon: Icon.Clipboard,
        key: ActionType.copyPath,
        title: "Copy File Path",
        execute: fileManager.copy.filePath,
        pop: true,
        descriptionMarkdown: () => `## Copy file path to clipboard.
    
Example:
\`\`\`
${fileState$.selectedFilePath.get()}
\`\`\``,
      },
    ],
  },
  {
    title: "Rotate",
    list: [
      {
        icon: Icon.Circle,
        key: ActionType.rotate180,
        title: "Rotate 180°",
        execute: fileManager.modify.rotate._180,
        detail: () => {
          const process = fileState$.process.use();
          const processing = fileState$.processing.use();
          const actionType = fileState$.latestAction.use();
          let content = "";
          if (processing) {
            content = `Processing: ${process} %`;
          } else if (process === 100 && actionType === ActionType.rotate180) {
            content = `Processed`;
          } else {
            content = `Press enter start rotate`;
          }
          return <List.Item.Detail markdown={content} />;
        },
      },
      {
        icon: Icon.RotateClockwise,
        key: ActionType.rotate90,
        title: "Rotate Right (90°)",
        execute: fileManager.modify.rotate.right,
        detail: () => {
          const process = fileState$.process.use();
          const processing = fileState$.processing.use();
          const actionType = fileState$.latestAction.use();
          let content = "";
          if (processing) {
            content = `Processing: ${process} %`;
          } else if (process === 100 && actionType === ActionType.rotate90) {
            content = `Processed`;
          } else {
            content = `Press enter start rotate`;
          }
          return <List.Item.Detail markdown={content} />;
        },
      },
      {
        icon: Icon.RotateAntiClockwise,
        key: ActionType.rotate_90,
        title: "Rotate Left (-90°)",
        execute: fileManager.modify.rotate.left,
        detail: () => {
          const process = fileState$.process.use();
          const processing = fileState$.processing.use();
          const actionType = fileState$.latestAction.use();
          let content = "";
          if (processing) {
            content = `Processing: ${process} %`;
          } else if (process === 100 && actionType === ActionType.rotate_90) {
            content = `Processed`;
          } else {
            content = `Press enter start rotate`;
          }
          return <List.Item.Detail markdown={content} />;
        },
      },
    ],
  },
];

export function RunAction() {
  const { pop } = useNavigation();
  const fileType = fileState$.fileType.use();
  if (fileType === FileType.other) {
    return (
      <List navigationTitle="FFmpeg" isShowingDetail={false}>
        <List.Item title="Current file is not support by FFmpeg" />
      </List>
    );
  }

  return (
    <List navigationTitle="FFmpeg" isShowingDetail={true} filtering={true}>
      {options.map((section, sectionIndex) => {
        return (
          <List.Section title={section.title} key={sectionIndex}>
            {section.list.map((item) => {
              let $detail: ReactNode | undefined;
              if (item.detail) {
                $detail = item.detail();
              } else if (item.descriptionMarkdown) {
                $detail = <List.Item.Detail markdown={item.descriptionMarkdown()} />;
              }
              return (
                <List.Item
                  icon={item.icon}
                  title={item.title}
                  id={item.key}
                  key={item.key}
                  detail={$detail}
                  actions={
                    <ActionPanel title="FFmpeg Action">
                      <Action
                        title="Run"
                        onAction={() => {
                          if (item.execute) {
                            item.execute();
                          }
                          if (item.pop) {
                            pop();
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
