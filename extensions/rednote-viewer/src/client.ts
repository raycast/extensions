import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { DetailData, HomeFeedRequest, ImageInfo, NoteItem, Sandbox, SearchRequest, Tag } from "./types.js";
import { getHomeFeedApi, getMeApi, getNoteApi, searchPostApi } from "./api.js";
import { environment, getPreferenceValues, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BASE_URL, COMMON_HEADER, HOME_PAGE_SIZE, SEARCH_PAGE_SIZE } from "./constants.js";

class XhsClient {
  private sandbox: vm.Context | null = null;
  private cookie: string | null = null;
  private isCookieValid: boolean = false;
  private initPromise: Promise<boolean>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<boolean> {
    if (this.sandbox) return this.isCookieValid;

    const sandbox: Sandbox = {
      global,
      console,
      setTimeout,
      setInterval,
    };
    sandbox.global = sandbox;
    this.sandbox = vm.createContext(sandbox);
    const rawPath = `${environment.assetsPath}/raw.min.js`;
    const code = await fs.readFile(rawPath, "utf-8");
    vm.runInContext(code, this.sandbox, {
      filename: "raw.js",
    });

    await this.checkCookie();
    return this.isCookieValid;
  }

  public ready() {
    return this.initPromise;
  }

  private async checkCookie(): Promise<boolean> {
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
      this.isCookieValid = false;
      return false;
    }

    try {
      await getMeApi(cookies);
      this.isCookieValid = true;
      this.cookie = cookies;
      return true;
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
      return false;
    }
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

  private getSearchId() {
    const e = BigInt(new Date().getTime()) << 64n;
    const t = Math.floor(Math.random() * 2147483647);
    const result = e + BigInt(t);
    return result.toString(36).toUpperCase();
  }

  private formatResponse(items: NoteItem[]) {
    const validItems = items.filter((item: NoteItem) => item.note_card);

    return validItems.map((item: NoteItem) => ({
      title: item.note_card?.display_title || "",
      noteId: item.id,
      xsecToken: item.xsec_token,
      originalUrl: this.getOriginalUrl(item.id, item.xsec_token),
      user: {
        nickname: item.note_card?.user.nickname || "",
        avatar: this.changeImageUrl(item.note_card?.user.avatar || ""),
      },
      cover: this.changeImageUrl(item.note_card?.cover.url_default || ""),
      markdown: `<img src="${this.changeImageUrl(item.note_card?.cover.url_default || "")}" alt="cover" max-height="220"/>`,
    }));
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
        video: noteInfo.video?.media.stream.h264[0]?.master_url,
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
    const destinationExists = await fs
      .access(destination, fs.constants.R_OK | fs.constants.W_OK)
      .then(() => true)
      .catch(() => false);
    if (!destinationExists) {
      await fs.mkdir(destination, { recursive: true });
    }

    const filename = `${details.title}.md`;
    const markdownFile = path.join(destination, filename);
    await fs.writeFile(markdownFile, markdown);

    // TODO: download image/video if needed
    // for (const image of details.images) {
    //   await downloadAssetApi(image, destination);
    // }
    // for (const video of details.videos) {
    //   await downloadAssetApi(video, destination);
    // }

    open(destination);
  }

  public async searchPost(keyword: string, page = 1) {
    if (!this.isCookieValid) {
      showFailureToast("Cookie not valid", {
        title: "Cookie not valid",
        message: "Please update your cookie in extension preferences",
        primaryAction: {
          title: "Update Cookie",
          onAction: openExtensionPreferences,
        },
      });
      return {
        hasMore: false,
        items: [],
      };
    }

    try {
      const data: SearchRequest = {
        keyword,
        page,
        page_size: SEARCH_PAGE_SIZE,
        search_id: this.getSearchId(),
        sort: "general",
        note_type: 0,
        ext_flags: [],
        geo: "",
        image_formats: ["jpg", "webp", "avif"],
      };
      const headers = {
        Cookie: this.cookie!,
      };

      const res = await searchPostApi(data, headers);
      return {
        hasMore: res.has_more,
        items: this.formatResponse(res.items),
      };
    } catch (error) {
      showFailureToast(error);
      return {
        hasMore: false,
        items: [],
      };
    }
  }

  public async getHomeFeed() {
    if (!this.isCookieValid) {
      showFailureToast("Cookie not valid", {
        title: "Cookie not valid",
        message: "Please update your cookie in extension preferences",
        primaryAction: {
          title: "Update Cookie",
          onAction: openExtensionPreferences,
        },
      });
      return [];
    }

    try {
      const uri = "/api/sns/web/v1/homefeed";
      const data: HomeFeedRequest = {
        category: "homefeed_recommend",
        cursor_score: "",
        image_formats: ["jpg", "webp", "avif"],
        need_filter_image: false,
        need_num: HOME_PAGE_SIZE,
        num: HOME_PAGE_SIZE * 2 + 2,
        note_index: 0,
        refresh_type: 1,
        search_key: "",
        unread_begin_note_id: "",
        unread_end_note_id: "",
        unread_note_count: 0,
      };

      const cryptoHeader = this.getHeader(uri, data);
      const headers = {
        "X-S": cryptoHeader["X-s"].toString(),
        "X-T": cryptoHeader["X-t"].toString(),
        Cookie: this.cookie!,
        ...COMMON_HEADER,
      };

      const res = await getHomeFeedApi(data, headers);
      return this.formatResponse(res.items);
    } catch (error) {
      showFailureToast(error);
      return [];
    }
  }
}

const client = new XhsClient();

export default client;
