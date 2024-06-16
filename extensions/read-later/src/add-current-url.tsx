import { showToast, Toast, BrowserExtension, closeMainWindow, popToRoot } from "@raycast/api";

import fs from 'fs';
import path from 'path';
import os from 'os';
export default async function Main() {
 
  try {
  const tabs: Array<BrowserExtension.Tab> = await BrowserExtension.getTabs();
  console.log('tabs',tabs);
  // 从tabs中找到active为true的tab
    const activeTab = tabs.find(tab => tab.active);
    // 获取title和url
    const title = activeTab?.title;
    const url = activeTab?.url;
    // 将title和url以md的格式写入read-later.md
    const markdown = `- [${title}](${url})\n`;

    // 定义文件路径
    const filePath = path.join(os.homedir(), 'read-later.md');
    
    // 将Markdown数据追加到文件中
    fs.appendFileSync(filePath, markdown);
    await popToRoot();
    showToast(Toast.Style.Success, "saved successfully!");
    // 0.5s 后关闭窗口
    setTimeout(() => {
      closeMainWindow();
    }, 500);

  } catch (error) {
    console.log('url', 123);
//   await popToRoot();
    showToast(Toast.Style.Failure, "Failed to save URL.");
    
    console.error(error);
    console.log('333')
  }
};
