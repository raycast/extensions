import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { DetailData, ImageInfo, Sandbox, Tag } from "./types.js";
import { getMeApi, getNoteApi } from "./api.js";
import { environment, getPreferenceValues, open, openExtensionPreferences, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BASE_URL, COMMON_HEADER } from "./constants.js";

class XhsClient {
  private sandbox: vm.Context | null = null;
  private cookie: string | null = null;
  private isCookieValid: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.sandbox) return;

    const sandbox: Sandbox = {
      global,
      console,
      setTimeout,
      setInterval,
    };
    sandbox.global = sandbox;
    this.sandbox = vm.createContext(sandbox);
    const rawPath = `${environment.assetsPath}/raw.min.js`;
    const code = fs.readFileSync(rawPath, "utf-8");
    vm.runInContext(code, this.sandbox, {
      filename: "raw.js",
    });
    console.info("Sandbox initialized");

    this.checkCookie();
  }

  private async checkCookie() {
    const { cookies } = getPreferenceValues<ExtensionPreferences>();
    if (!cookies) {
      showFailureToast("Cookie not found", {
        title: "Cookie not found",
        message: "Please set your cookie in extension preferences",
        primaryAction: {
          title: "Set Cookie",
          onAction: openExtensionPreferences,
        },
      });
      return;
    }

    try {
      await getMeApi(cookies);
      this.isCookieValid = true;
      showToast({
        title: "Cookie is valid",
      });
    } catch {
      this.isCookieValid = false;
      showFailureToast("Cookie not valid", {
        title: "Cookie not valid",
        message: "Please update your cookie in extension preferences",
        primaryAction: {
          title: "Update Cookie",
          onAction: openExtensionPreferences,
        },
      });
    }

    this.cookie = cookies;
  }

  private getHeader(uri: string, data: unknown) {
    return this.sandbox?.getXsXt(uri, data, this.cookie!);
  }

  private changeImageUrl(url: string) {
    return url.replace("http://", "https://");
  }

  private getOriginalUrl(noteId: string, xToken: string) {
    return `${BASE_URL}/explore/${noteId}?xsec_token=${xToken}&xsec_source=pc_user`;
  }

  public async getNoteInfo(noteId: string, xToken: string) {
    if (!this.isCookieValid) {
      showFailureToast("Cookie not valid", {
        title: "Cookie not valid",
        message: "Please update your cookie in extension preferences",
        primaryAction: {
          title: "Update Cookie",
          onAction: openExtensionPreferences,
        },
      });
      return;
    }

    const uri = "/api/sns/web/v1/feed";
    const data = {
      source_note_id: noteId,
      image_formats: ["jpg", "webp", "avif"],
      extra: { need_body_topic: "1" },
      xsec_source: "pc_feed",
      xsec_token: xToken,
    };

    const cryptoHeader = this.getHeader(uri, data);
    const headers = {
      "X-S": cryptoHeader["X-s"].toString(),
      "X-T": cryptoHeader["X-t"].toString(),
      Cookie: this.cookie!,
      ...COMMON_HEADER,
    };

    try {
      const res = await getNoteApi(data, headers);
      const noteInfo = res.items[0]?.note_card || null;
      if (!noteInfo) {
        return null;
      }
      const type = noteInfo.type;
      const details: DetailData = {
        type: noteInfo.type,
        title: noteInfo.title,
        desc: noteInfo.desc,
        noteId: noteInfo.note_id,
        tags: noteInfo.tag_list.map((tag: Tag) => tag.name),
        user: {
          nickname: noteInfo.user.nickname,
          avatar: this.changeImageUrl(noteInfo.user.avatar),
        },
        images: noteInfo.image_list.map((image: ImageInfo) => this.changeImageUrl(image.url_default)),
        video: type === "video" ? noteInfo.video.media.stream.h264[0].master_url : "",
        originalUrl: this.getOriginalUrl(noteInfo.note_id, xToken),
      };
      return details;
    } catch (error) {
      showFailureToast(error);
    }
  }

  public async saveToLocal(details: DetailData) {
    const markdown = [
      `# ${details.title}`,
      details.desc,
      "---",
      `**创作者**: ${details.user.nickname}`,
      details.tags.length > 0 ? `**标签**: ${details.tags.map((tag) => `#${tag}`).join(" ")}` : "",
      `[原文链接](${details.originalUrl})`,
      "---",
      ...details.images.map((image) => `![](${image})`),
      details.video ? `<video src="${details.video}" controls></video>` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const dir = details.noteId;
    const destination = path.join(os.homedir(), "Downloads", dir);
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const filename = `${details.title}.md`;
    const markdownFile = path.join(destination, filename);
    fs.writeFileSync(markdownFile, markdown);

    // TODO: download image/video if needed
    // for (const image of details.images) {
    //   await downloadAssetApi(image, destination);
    // }
    // for (const video of details.videos) {
    //   await downloadAssetApi(video, destination);
    // }

    open(destination);
  }
}

const client = new XhsClient();

export default client;
