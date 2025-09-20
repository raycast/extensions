import { List } from "@raycast/api";

interface ChatFile {
  object: "file";
  name: string;
  content: string;
}

interface ChatFilesDetailProps {
  files: ChatFile[];
}

export default function ChatFilesDetail({ files }: ChatFilesDetailProps) {
  return (
    <List navigationTitle="Files" isShowingDetail>
      {files.map((file) => (
        <List.Item
          key={file.name}
          title={file.name}
          detail={<List.Item.Detail markdown={`\`\`\`\n${file.content}\n\`\`\``} />}
        />
      ))}
    </List>
  );
}
