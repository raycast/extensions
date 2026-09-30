import { ActionPanel, Action, Icon, List, confirmAlert, showToast, Toast, open, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";

type HTMLFileInfo = {
  filename: string;
  title: string;
  description: string;
  content: string;
};

export async function listHTMLFiles(): Promise<HTMLFileInfo[]> {
  const supportPath = environment.supportPath;
  const files = fs.readdirSync(supportPath);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));

  const htmlFileInfos: HTMLFileInfo[] = htmlFiles.map((file) => {
    const filePath = path.join(supportPath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const descriptionMatch = content.match(/<meta name="description" content="(.*?)">/);

    const title = titleMatch ? titleMatch[1] : "No title";
    const description = descriptionMatch ? descriptionMatch[1] : "No description";

    return {
      filename: file,
      title,
      description,
      content,
    };
  });

  return htmlFileInfos;
}

export default function Command() {
  const [items, setItems] = useState<HTMLFileInfo[]>([]);

  useEffect(() => {
    async function fetchData() {
      const htmlFileInfos = await listHTMLFiles();
      setItems(htmlFileInfos);
    }
    fetchData();
  }, []);

  const openSupportDirectory = () => {
    const supportPath = environment.supportPath;
    open(supportPath);
  };

  const deleteApp = async (filename: string) => {
    const supportPath = environment.supportPath;
    const filePath = path.join(supportPath, filename);

    const confirmed = await confirmAlert({
      title: "Delete App",
      message: `Are you sure you want to delete ${filename}?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      fs.unlinkSync(filePath);
      showToast(Toast.Style.Success, "App deleted", `${filename} has been deleted`);
      setItems((prevItems) => prevItems.filter((item) => item.filename !== filename));
    }
  };

  return (
    <List isShowingDetail>
      {items.map((item) => (
        <List.Item
          key={item.filename}
          icon={Icon.Document}
          title={item.title}
          detail={
            <List.Item.Detail
              markdown={`# ${item.title}\n\`${item.filename}\`\n>${item.description}\n\`\`\`html\n${item.content}\n\`\`\``}
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Globe}
                onAction={() => {
                  console.log(item.filename);
                  open(environment.supportPath + "/" + item.filename);
                }}
                title="Open App"
              />
              <Action icon={Icon.Folder} title="Open Support Directory" onAction={openSupportDirectory} />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Delete App"
                onAction={() => deleteApp(item.filename)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
