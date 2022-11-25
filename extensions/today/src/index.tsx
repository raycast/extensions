import { Action, ActionPanel, Grid, showHUD, showToast, Toast } from "@raycast/api";
import os from "os";
import { useEffect, useState } from "react";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { runAppleScript } from "run-applescript";
import * as fileType from "file-type";
import dayjs from "dayjs";

async function executeAppleScript(imagePath: string) {
  return await runAppleScript(`
        tell application "System Events"
            tell every desktop
                set picture to "${imagePath}"
            end tell
        end tell
    `);
}

export default function Command() {
  const [img, setImg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function init() {
    const host = "https://bing.com";
    const target = "https://www.bing.com/hp/api/model?mkt=zh-CN";
    axios
      .get(target, {
        headers: {
          authority: "www.bing.com",
          method: "GET",
          path: "/hp/api/model",
          scheme: "https",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "zh-CN,zh;q=0.9",
          dnt: "1",
          "sec-ch-ua": '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "macOS",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
        },
      })
      .then((res) => {
        const url = res.data.MediaContents[0].ImageContent.Image.Url;
        const value = host + url;
        setIsLoading(false);
        setImg(value);
      });
  }

  useEffect(() => {
    setIsLoading(false);
    init().then();
  }, []);

  async function downloadFile(url: string): Promise<string> {
    const filepath = `/Users/${os.userInfo().username}/images`;
    if (!fs.existsSync(filepath)) {
      fs.mkdirSync(filepath);
    }
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
    });
    const fileTypeResult = await fileType.fileTypeFromBuffer(response.data);
    const imagePath = path.resolve(filepath, `${dayjs().format("YYYY-MM-DD")}.${fileTypeResult?.ext}`);
    return new Promise((resolve, reject) => {
      try {
        fs.writeFileSync(imagePath, response.data);
        resolve(imagePath);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function handleSet(item: string) {
    const image: string = await downloadFile(item);
    console.log("[image]: ", image);
    await executeAppleScript(image)
      .then(() => {
        showToast(Toast.Style.Success, "背景图", "设置成功!");
        setTimeout(() => {
          showHUD("桌面已更新");
        }, 1500);
      })
      .catch(() => {
        showToast(Toast.Style.Failure, "背景图", "设置失败!");
        showHUD("桌面更新失败");
      });
  }

  return (
    <Grid
      isLoading={isLoading}
      columns={1}
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      aspectRatio="16/9"
      searchBarPlaceholder="按回车进行设置"
    >
      <Grid.Item
        key={img}
        content={img}
        actions={
          <ActionPanel title="set background">
            <Action title="" onAction={() => handleSet(img)}></Action>
          </ActionPanel>
        }
      />
    </Grid>
  );
}
