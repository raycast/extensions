import axios, { AxiosInstance } from "axios";
import { getPreferenceValues } from "@raycast/api";
import {
  SiYuanApiResponse,
  SiYuanSearchResult,
  SiYuanNotebook,
  SiYuanTemplate,
  CreateNoteParams,
  SiYuanBlock,
  AssetFile,
} from "../types";

interface Preferences {
  siyuanUrl: string;
  apiToken?: string;
  notebookId?: string;
  dailyNotePath: string;
  workspacePath: string;
}

class SiYuanAPI {
  private client: AxiosInstance;
  private preferences: Preferences;

  constructor() {
    this.preferences = getPreferenceValues<Preferences>();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 根据思源笔记API文档添加认证头
    if (this.preferences.apiToken) {
      headers["Authorization"] = `Token ${this.preferences.apiToken}`;
    }

    this.client = axios.create({
      baseURL: this.preferences.siyuanUrl,
      headers,
      timeout: 10000, // 10秒超时
    });
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      // 使用最简单的系统API测试连接
      const response = await this.request<{ version: string }>(
        "/system/version",
      );
      console.log("Connection test successful:", response);
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  private async request<T>(endpoint: string, data?: unknown): Promise<T> {
    try {
      console.log(
        `Making API request to: ${this.preferences.siyuanUrl}/api${endpoint}`,
      );
      console.log(`Request data:`, data);

      const response = await this.client.post<SiYuanApiResponse<T>>(
        `/api${endpoint}`,
        data,
      );

      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, JSON.stringify(response.data, null, 2));

      // 检查响应数据是否有效
      if (!response.data) {
        throw new Error("API 响应数据为空");
      }

      if (response.data.code !== 0) {
        throw new Error(
          response.data.msg ||
            `SiYuan API 返回错误 (code: ${response.data.code})`,
        );
      }

      return response.data.data;
    } catch (error: unknown) {
      const err = error as Error & {
        code?: string;
        response?: {
          status: number;
          data?: { msg?: string };
          statusText: string;
        };
        request?: unknown;
      };
      console.error("SiYuan API Error:", error);

      if (err.code === "ECONNREFUSED") {
        throw new Error(
          `无法连接到思源笔记服务器 ${this.preferences.siyuanUrl}。请确认思源笔记正在运行并且允许API访问。`,
        );
      }

      if (err.response) {
        throw new Error(
          `API请求失败 (${err.response.status}): ${err.response.data?.msg || err.response.statusText}`,
        );
      }

      if (err.request) {
        throw new Error(
          `网络请求失败: ${err.message}。请检查思源笔记是否运行在 ${this.preferences.siyuanUrl}`,
        );
      }

      throw new Error(`API请求错误: ${err.message}`);
    }
  }

  // 根据路径关键词搜索匹配的笔记本和文档路径
  async searchPaths(
    pathKeyword: string,
  ): Promise<{ notebooks: string[]; paths: string[] }> {
    console.log(`搜索路径关键词: ${pathKeyword}`);

    if (!pathKeyword.trim()) {
      return { notebooks: [], paths: [] };
    }

    try {
      // 1. 首先获取所有笔记本并搜索匹配的笔记本名称
      const notebooks = await this.getNotebooks();
      const matchedNotebooks = notebooks
        .filter((nb) =>
          nb.name.toLowerCase().includes(pathKeyword.toLowerCase()),
        )
        .map((nb) => nb.id);

      console.log("匹配的笔记本:", matchedNotebooks);

      // 2. 搜索包含路径关键词的文档路径
      const pathSql = `
        SELECT DISTINCT hpath
        FROM blocks 
        WHERE type = 'd' 
          AND hpath LIKE '%${pathKeyword}%'
        ORDER BY hpath
        LIMIT 50
      `;

      console.log("路径搜索SQL:", pathSql);

      const pathResponse = await this.request<Array<{ hpath: string }>>(
        "/query/sql",
        {
          stmt: pathSql,
        },
      );

      const matchedPaths = (pathResponse || [])
        .map((item) => item.hpath)
        .filter((path) => path && path.trim())
        .map((path) => path.trim());

      console.log("匹配的文档路径:", matchedPaths);

      return {
        notebooks: matchedNotebooks,
        paths: matchedPaths,
      };
    } catch (error) {
      console.error("路径搜索失败:", error);
      return { notebooks: [], paths: [] };
    }
  }

  // 搜索笔记 - 使用SQL查询方式，搜索文档和块
  async searchNotes(
    query: string,
    notebookId?: string,
    pathFilter?: string,
  ): Promise<SiYuanSearchResult> {
    console.log(`搜索查询: ${query}`);
    console.log(`路径筛选: ${pathFilter}`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    console.log("笔记本映射:", notebookMap);

    // 构建笔记本筛选条件
    const notebookFilter =
      notebookId && notebookId !== "all" ? `AND d.box = '${notebookId}'` : "";
    const blockNotebookFilter =
      notebookId && notebookId !== "all" ? `AND b.box = '${notebookId}'` : "";

    // 如果有路径筛选，先查找匹配的笔记本和路径
    let pathFilterCondition = "";
    let blockPathFilterCondition = "";
    let notebookFilterCondition = "";
    let blockNotebookFilterCondition = "";
    let matchedData: { notebooks: string[]; paths: string[] } = {
      notebooks: [],
      paths: [],
    };

    if (pathFilter && pathFilter.trim()) {
      matchedData = await this.searchPaths(pathFilter);

      if (
        matchedData.notebooks.length === 0 &&
        matchedData.paths.length === 0
      ) {
        // 没有找到匹配的笔记本或路径，返回空结果
        console.log("未找到匹配的笔记本或路径，返回空结果");
        return {
          blocks: [],
          matchedBlockCount: 0,
          matchedRootCount: 0,
          pageCount: 1,
          matchedPaths: [],
          matchedNotebooks: [],
        };
      }

      // 构建筛选条件
      const conditions = [];

      // 添加笔记本筛选条件
      if (matchedData.notebooks.length > 0) {
        const notebookList = matchedData.notebooks
          .map((id) => `'${id}'`)
          .join(",");
        notebookFilterCondition = `d.box IN (${notebookList})`;
        blockNotebookFilterCondition = `b.box IN (${notebookList})`;
        conditions.push("notebook");
      }

      // 添加路径筛选条件
      if (matchedData.paths.length > 0) {
        const pathList = matchedData.paths.map((path) => `'${path}'`).join(",");
        pathFilterCondition = `d.hpath IN (${pathList})`;
        blockPathFilterCondition = `doc.hpath IN (${pathList})`;
        conditions.push("path");
      }

      console.log(
        `找到 ${matchedData.notebooks.length} 个匹配的笔记本，${matchedData.paths.length} 个匹配的路径`,
      );
    }

    // 构建最终的筛选条件
    let finalDocFilter = "";
    let finalBlockFilter = "";

    if (pathFilter && pathFilter.trim()) {
      const docConditions = [];
      const blockConditions = [];

      if (notebookFilterCondition) {
        docConditions.push(notebookFilterCondition);
      }
      if (pathFilterCondition) {
        docConditions.push(pathFilterCondition);
      }
      if (blockNotebookFilterCondition) {
        blockConditions.push(blockNotebookFilterCondition);
      }
      if (blockPathFilterCondition) {
        blockConditions.push(blockPathFilterCondition);
      }

      if (docConditions.length > 0) {
        finalDocFilter = `AND (${docConditions.join(" OR ")})`;
      }
      if (blockConditions.length > 0) {
        finalBlockFilter = `AND (${blockConditions.join(" OR ")})`;
      }
    }

    // 搜索文档（标题匹配）
    const docSql = `
      SELECT 
        d.*,
        d.content as doc_title,
        d.hpath as doc_path
      FROM blocks d
      WHERE d.type = 'd' 
        AND (d.content LIKE '%${query}%' OR d.name LIKE '%${query}%' OR d.alias LIKE '%${query}%')
        ${notebookFilter}
        ${finalDocFilter}
      ORDER BY d.updated DESC 
      LIMIT 25
    `;

    // 搜索块内容
    const blockSql = `
      SELECT 
        b.*,
        doc.content as doc_title,
        doc.hpath as doc_path
      FROM blocks b
      LEFT JOIN blocks doc ON b.root_id = doc.id AND doc.type = 'd'
      WHERE (b.content LIKE '%${query}%' OR b.name LIKE '%${query}%' OR b.alias LIKE '%${query}%')
        AND b.type != 'd'
        ${blockNotebookFilter}
        ${finalBlockFilter}
      ORDER BY b.updated DESC 
      LIMIT 25
    `;

    console.log("文档搜索SQL:", docSql);
    console.log("块搜索SQL:", blockSql);

    // 并行执行两个查询
    const [docResponse, blockResponse] = await Promise.all([
      this.request<SiYuanBlock[]>("/query/sql", { stmt: docSql }),
      this.request<SiYuanBlock[]>("/query/sql", { stmt: blockSql }),
    ]);

    console.log("文档搜索响应:", docResponse);
    console.log("块搜索响应:", blockResponse);

    // 处理文档结果
    const docs = (docResponse || []).map((doc) => {
      const notebookName = notebookMap.get(doc.box) || "未知笔记本";
      console.log(`文档 ${doc.id}: box=${doc.box}, 笔记本名称=${notebookName}`);

      return {
        ...doc,
        doc_title: doc.content, // 文档的标题就是content
        doc_path: doc.hpath,
        notebook_name: notebookName,
        notebook_id: doc.box,
        // 标记为文档类型，用于UI区分
        isDocument: true,
      };
    });

    // 处理块结果
    const blocks = (blockResponse || []).map((block) => {
      const notebookName = notebookMap.get(block.box) || "未知笔记本";
      console.log(
        `块 ${block.id}: box=${block.box}, 笔记本名称=${notebookName}`,
      );

      return {
        ...block,
        doc_title:
          (block as SiYuanBlock & { doc_title?: string }).doc_title ||
          block.content,
        doc_path:
          (block as SiYuanBlock & { doc_path?: string }).doc_path ||
          block.hpath,
        notebook_name: notebookName,
        notebook_id: block.box,
        isDocument: false,
      };
    });

    // 合并结果，文档优先显示
    const allResults = [...docs, ...blocks];

    console.log("所有搜索结果:", allResults);

    return {
      blocks: allResults,
      matchedBlockCount: allResults.length,
      matchedRootCount: docs.length,
      pageCount: 1,
      matchedPaths: matchedData.paths,
      matchedNotebooks: matchedData.notebooks,
    };
  }

  // 全文搜索
  async fullTextSearch(query: string): Promise<SiYuanSearchResult> {
    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 使用JOIN查询获取块和其所属文档信息
    const sql = `
      SELECT 
        b.*,
        doc.content as doc_title,
        doc.hpath as doc_path
      FROM blocks b
      LEFT JOIN blocks doc ON b.root_id = doc.id AND doc.type = 'd'
      WHERE b.content LIKE '%${query}%'
        AND b.type != 'd'
      ORDER BY b.updated DESC 
      LIMIT 50
    `;

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加文档标题和笔记本信息
    const blocks = (response || []).map((block) => ({
      ...block,
      doc_title:
        (block as SiYuanBlock & { doc_title?: string }).doc_title ||
        block.content,
      doc_path:
        (block as SiYuanBlock & { doc_path?: string }).doc_path || block.hpath,
      notebook_name: notebookMap.get(block.box) || "未知笔记本",
      notebook_id: block.box,
    }));

    return {
      blocks,
      matchedBlockCount: blocks.length,
      matchedRootCount: 0,
      pageCount: 1,
    };
  }

  // 获取笔记本列表
  async getNotebooks(): Promise<SiYuanNotebook[]> {
    const response = await this.request<{ notebooks: SiYuanNotebook[] }>(
      "/notebook/lsNotebooks",
    );

    return response.notebooks || [];
  }

  // 创建文档
  async createNote(params: CreateNoteParams): Promise<string> {
    const docId = await this.request<string>("/filetree/createDocWithMd", {
      notebook: params.notebook,
      path: params.path,
      markdown: params.content || "",
    });

    return docId;
  }

  // 创建每日笔记（带特殊属性）
  async createDailyNote(
    params: CreateNoteParams & { date: string },
  ): Promise<string> {
    try {
      // 使用SiYuan API创建文档
      const docId = await this.request<string>("/filetree/createDocWithMd", {
        notebook: params.notebook,
        path: params.path,
        markdown: params.content || "",
      });

      console.log("每日笔记文档创建成功:", docId);

      // 根据SiYuan API文档，为每日笔记添加自定义属性
      try {
        const dailyNoteAttr = `custom-dailynote-${params.date.replace(/-/g, "")}`;
        await this.setBlockAttribute(docId, dailyNoteAttr, "true");
        await this.setBlockAttribute(docId, "custom-dailynote", params.date);
        console.log("每日笔记属性设置成功:", dailyNoteAttr);
      } catch (attrError) {
        console.warn("设置每日笔记属性失败:", attrError);
        // 不影响主要功能，继续执行
      }

      return docId;
    } catch (error) {
      console.error("创建每日笔记失败:", error);
      throw error;
    }
  }

  // 创建带模板的文档
  async createNoteWithTemplate(
    params: CreateNoteParams & { templateId: string },
  ): Promise<string> {
    const response = await this.request<{ id: string }>(
      "/filetree/createDocWithMd",
      {
        notebook: params.notebook,
        path: params.path,
        title: params.title,
        template: params.templateId,
      },
    );

    return response.id;
  }

  // 获取模板列表
  async getTemplates(): Promise<SiYuanTemplate[]> {
    // 由于模板API端点可能不稳定，返回空数组让用户可以正常使用
    // 用户可以不使用模板功能
    console.log("模板功能暂时不可用，跳过模板加载");
    return [];
  }

  // 插入块到文档
  async insertBlock(
    parentId: string,
    content: string,
    dataType?: string,
  ): Promise<string> {
    const response = await this.request<{ id: string }>("/block/insertBlock", {
      dataType: dataType || "markdown",
      data: content,
      parentID: parentId,
    });

    return response.id;
  }

  // 追加块到文档
  async appendBlock(
    parentId: string,
    content: string,
    dataType?: string,
  ): Promise<string> {
    const response = await this.request<{ id: string }>("/block/appendBlock", {
      dataType: dataType || "markdown",
      data: content,
      parentID: parentId,
    });

    return response.id;
  }

  // 获取最近访问的文档
  async getRecentDocs(): Promise<SiYuanBlock[]> {
    console.log("获取最近访问的文档...");

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    console.log("笔记本映射:", notebookMap);

    // 使用 SQL 查询获取最近访问的文档
    const sql = `SELECT * FROM blocks WHERE type = 'd' ORDER BY updated DESC LIMIT 20`;

    console.log("最近文档SQL:", sql);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    console.log("最近文档原始响应:", response);

    // 转换为预期的格式，添加笔记本信息
    const docs = (response || []).map((doc) => {
      const notebookName = notebookMap.get(doc.box) || "未知笔记本";
      console.log(`文档 ${doc.id}: box=${doc.box}, 笔记本名称=${notebookName}`);

      return {
        ...doc,
        notebook_name: notebookName,
        notebook_id: doc.box,
      };
    });

    console.log("处理后的文档:", docs);

    return docs;
  }

  // 获取块信息
  async getBlockInfo(blockId: string): Promise<SiYuanBlock> {
    const response = await this.request<SiYuanBlock>("/block/getBlockInfo", {
      id: blockId,
    });

    return response;
  }

  // 获取完整的文档内容
  async getDocumentContent(docId: string): Promise<string> {
    try {
      console.log(`获取文档内容: ${docId}`);

      // 首先获取文档的基本信息
      const docSql = `
        SELECT content, markdown, hpath
        FROM blocks 
        WHERE id = '${docId}' AND type = 'd'
      `;

      const docResponse = await this.request<SiYuanBlock[]>("/query/sql", {
        stmt: docSql,
      });

      console.log("文档基本信息响应:", docResponse);

      if (!docResponse || docResponse.length === 0) {
        return "";
      }

      const doc = docResponse[0];
      const docTitle = doc.content || "无标题";

      // 获取文档下的所有内容块
      const contentSql = `
        SELECT content, markdown, type
        FROM blocks 
        WHERE root_id = '${docId}' AND type != 'd'
        ORDER BY id
      `;

      const contentResponse = await this.request<SiYuanBlock[]>("/query/sql", {
        stmt: contentSql,
      });

      console.log("文档内容块响应:", contentResponse);

      if (!contentResponse || contentResponse.length === 0) {
        // 如果没有内容块，就返回文档标题
        return `# ${docTitle}\n\n暂无内容`;
      }

      // 构建完整的markdown内容
      let fullContent = `# ${docTitle}\n\n`;

      contentResponse.forEach((block) => {
        // 优先使用 markdown 字段，因为它保留了原始的 markdown 格式（包括链接）
        let blockContent = block.markdown || block.content;

        if (blockContent && blockContent.trim()) {
          // 处理本地文件链接，将相对路径转换为绝对路径
          blockContent = this.processLocalFileLinks(blockContent);

          // 根据块类型添加适当的markdown格式
          switch (block.type) {
            case "h":
              // 标题块 - markdown字段已经包含了##格式
              fullContent += `${blockContent}\n\n`;
              break;
            case "p":
              // 段落块
              fullContent += `${blockContent}\n\n`;
              break;
            case "l":
              // 列表块
              fullContent += `${blockContent}\n\n`;
              break;
            case "c":
              // 代码块 - 如果markdown字段没有包含代码块语法，添加它
              if (!blockContent.startsWith("```")) {
                fullContent += `\`\`\`\n${blockContent}\n\`\`\`\n\n`;
              } else {
                fullContent += `${blockContent}\n\n`;
              }
              break;
            default:
              fullContent += `${blockContent}\n\n`;
          }
        }
      });

      console.log("构建的完整内容:", fullContent);
      return fullContent;
    } catch (error) {
      console.error("获取文档内容失败:", error);
      return "";
    }
  }

  // 提取markdown中的本地文件路径信息
  extractLocalFilePaths(
    content: string,
  ): { text: string; path: string; isAsset: boolean; originalPath: string }[] {
    if (!content) return [];

    const linkRegex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
    const filePaths: {
      text: string;
      path: string;
      isAsset: boolean;
      originalPath: string;
    }[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const [, , text, path] = match;

      // 跳过网络链接和思源内部链接
      if (
        path.startsWith("http://") ||
        path.startsWith("https://") ||
        path.startsWith("siyuan://")
      ) {
        continue;
      }

      // 检查是否是assets文件
      const isAsset = path.startsWith("assets/");

      filePaths.push({
        text: text || path,
        path: path,
        isAsset: isAsset,
        originalPath: path,
      });
    }

    return filePaths;
  }

  // 将assets路径转换为本地文件路径
  getAssetFilePath(assetPath: string): string | null {
    if (!assetPath.startsWith("assets/")) {
      return null;
    }

    const fileName = assetPath.substring(7); // 移除 'assets/' 前缀

    // 如果用户配置了工作空间路径，优先使用
    if (this.preferences.workspacePath) {
      const workspacePath = this.preferences.workspacePath.replace(/\/$/, ""); // 移除末尾斜杠
      return `${workspacePath}/data/assets/${fileName}`;
    }

    // 回退到常见的SiYuan数据目录位置
    const userHome =
      process.env.HOME || process.env.USERPROFILE || "/Users/用户名";
    const possiblePaths = [
      `${userHome}/Documents/SiYuan/data/assets/${fileName}`,
      `${userHome}/SiYuan/data/assets/${fileName}`,
      `${userHome}/.siyuan/data/assets/${fileName}`,
      `${userHome}/Library/Application Support/SiYuan/data/assets/${fileName}`,
      `${userHome}/AppData/Roaming/SiYuan/data/assets/${fileName}`, // Windows
    ];

    // 返回第一个可能的路径
    return possiblePaths[0];
  }

  // 将任意文件路径转换为本地绝对路径
  getLocalFilePath(filePath: string): string | null {
    console.log(`[DEBUG] getLocalFilePath called with: "${filePath}"`);

    // 跳过网络链接和思源内部链接
    if (
      filePath.startsWith("http://") ||
      filePath.startsWith("https://") ||
      filePath.startsWith("siyuan://")
    ) {
      console.log(`[DEBUG] Skipping network/internal link: ${filePath}`);
      return null;
    }

    let resolvedPath: string;

    // 处理file://协议的URL
    if (filePath.startsWith("file://")) {
      console.log(`[DEBUG] Processing file:// URL: ${filePath}`);
      try {
        // 使用URL对象解析file://协议，自动处理URL解码
        const fileUrl = new URL(filePath);
        resolvedPath = decodeURIComponent(fileUrl.pathname);
        console.log(`[DEBUG] Decoded file path from URL: ${resolvedPath}`);
      } catch (error) {
        console.log(`[DEBUG] Failed to parse file:// URL: ${error}`);
        return null;
      }
    } else if (filePath.startsWith("/") || /^[A-Za-z]:/.test(filePath)) {
      // 如果已经是绝对路径，直接返回
      console.log(`[DEBUG] Absolute path detected: ${filePath}`);
      resolvedPath = filePath;
    } else if (filePath.startsWith("assets/")) {
      // 处理assets文件
      console.log(`[DEBUG] Processing assets file: ${filePath}`);
      const assetPath = this.getAssetFilePath(filePath);
      if (!assetPath) {
        console.log(`[DEBUG] Failed to resolve asset path for: ${filePath}`);
        return null;
      }
      resolvedPath = assetPath;
    } else {
      // 处理其他相对路径文件
      console.log(`[DEBUG] Processing relative path: ${filePath}`);
      if (this.preferences.workspacePath) {
        const workspacePath = this.preferences.workspacePath.replace(/\/$/, "");
        resolvedPath = `${workspacePath}/data/${filePath}`;
        console.log(`[DEBUG] Using configured workspace: ${resolvedPath}`);
      } else {
        // 如果没有工作空间配置，尝试常见位置
        const userHome =
          process.env.HOME || process.env.USERPROFILE || "/Users/用户名";
        const possibleBases = [
          `${userHome}/Documents/SiYuan/data`,
          `${userHome}/SiYuan/data`,
          `${userHome}/.siyuan/data`,
          `${userHome}/Library/Application Support/SiYuan/data`,
          `${userHome}/AppData/Roaming/SiYuan/data`,
        ];

        resolvedPath = `${possibleBases[0]}/${filePath}`;
        console.log(`[DEBUG] Using default workspace: ${resolvedPath}`);
      }
    }

    console.log(`[DEBUG] Final resolved path: ${resolvedPath}`);
    return resolvedPath;
  }

  // 获取验证后的文件路径（简化版本，让Raycast处理文件存在性检查）
  getValidatedFilePath(filePath: string): string | null {
    const localPath = this.getLocalFilePath(filePath);
    if (!localPath) {
      console.log(`[DEBUG] No local path resolved for: ${filePath}`);
      return null;
    }

    console.log(`[DEBUG] Resolved file path: ${localPath}`);
    return localPath;
  }

  // 将本地文件路径转换为适合Action.Open的格式
  getFileUrlForAction(filePath: string): string {
    const localPath = this.getLocalFilePath(filePath);
    if (!localPath) {
      return filePath;
    }

    // 确保路径是绝对路径
    let absolutePath = localPath;
    if (!absolutePath.startsWith("/") && !absolutePath.match(/^[A-Za-z]:/)) {
      absolutePath = `/${absolutePath}`;
    }

    // 对于macOS/Linux，Raycast的Action.Open可能需要file://协议
    // 但也可能直接接受文件路径
    console.log(`[DEBUG] Action.Open target path: ${absolutePath}`);
    return absolutePath;
  }

  // 处理本地文件链接，转换为自定义协议以支持默认程序打开
  processLocalFileLinks(content: string): string {
    if (!content) return content;

    // 匹配markdown链接格式：[文本](路径) 和 ![alt](路径)
    const linkRegex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;

    return content.replace(linkRegex, (match, isImage, text, path) => {
      console.log(`[DEBUG] processLocalFileLinks - Processing link: ${match}`);

      // 如果是网络链接（http/https），保持不变
      if (path.startsWith("http://") || path.startsWith("https://")) {
        console.log(`[DEBUG] Keeping network link: ${path}`);
        return match;
      }

      // 如果是思源内部链接（siyuan://），保持不变
      if (path.startsWith("siyuan://")) {
        console.log(`[DEBUG] Keeping siyuan link: ${path}`);
        return match;
      }

      // 如果已经是自定义协议，保持不变
      if (path.startsWith("siyuan-file://")) {
        console.log(`[DEBUG] Keeping custom protocol link: ${path}`);
        return match;
      }

      // 如果已经是file://协议，保持不变
      if (path.startsWith("file://")) {
        console.log(`[DEBUG] Keeping file protocol link: ${path}`);
        return match;
      }

      // 处理本地文件路径
      const localPath = this.getLocalFilePath(path);
      if (localPath) {
        console.log(`[DEBUG] Converting link: ${path}`);
        console.log(`[DEBUG] -> local path: ${localPath}`);

        if (isImage) {
          // 对于图片，使用file://协议显示
          const fileUrl = `file://${localPath}`;
          return `![${text}](${fileUrl})`;
        } else {
          // 对于文件链接，使用file://协议让用户可以直接点击在Finder中显示
          // 添加文件图标
          const fileIcon = text.includes(" 📎") ? "" : " 📎";
          // 生成正确的file://URL - 注意不要重复编码已经编码的路径
          let fileUrl: string;
          if (localPath.includes("%")) {
            // 如果路径已经包含编码字符，直接使用
            fileUrl = `file://${localPath}`;
          } else {
            // 对中文路径进行URL编码，但保持斜杠不被编码
            const encodedPath = localPath
              .split("/")
              .map((part) => encodeURIComponent(part))
              .join("/");
            fileUrl = `file://${encodedPath}`;
          }
          console.log(
            `[DEBUG] Generated file URL: ${fileUrl} for original path: ${localPath}`,
          );
          return `[${text}${fileIcon}](${fileUrl})`;
        }
      }

      console.log(`[DEBUG] No local path found for: ${path}, keeping original`);
      return match;
    });
  }

  // 处理自定义协议链接，打开本地文件
  async handleCustomProtocolLink(url: string): Promise<boolean> {
    console.log(`[DEBUG] handleCustomProtocolLink called with: ${url}`);

    if (!url.startsWith("siyuan-file://")) {
      console.log(`[DEBUG] Not a siyuan-file protocol: ${url}`);
      return false;
    }

    try {
      // 解码原始文件路径
      const encodedPath = url.substring("siyuan-file://".length);
      const originalPath = decodeURIComponent(encodedPath);
      console.log(`[DEBUG] Decoded file path: ${originalPath}`);

      // 获取本地文件路径
      const localPath = this.getLocalFilePath(originalPath);
      if (!localPath) {
        console.log(`[DEBUG] No local path found for: ${originalPath}`);
        return false;
      }

      console.log(`[DEBUG] Resolved local path: ${localPath}`);

      // 直接使用Raycast的open API
      const { open } = await import("@raycast/api");
      await open(localPath);

      console.log(`[DEBUG] Successfully opened file: ${localPath}`);
      return true;
    } catch (error) {
      console.error(`[DEBUG] Error handling custom protocol link:`, error);
      return false;
    }
  }

  // 获取文档URL
  getDocUrl(docId: string): string {
    return `${this.preferences.siyuanUrl}/stage/build/desktop/?id=${docId}`;
  }

  // 根据笔记本名称查找笔记本ID
  async findNotebookByName(notebookName: string): Promise<string | null> {
    try {
      const notebooks = await this.getNotebooks();
      const matchedNotebook = notebooks.find((nb) => nb.name === notebookName);

      if (matchedNotebook) {
        console.log(`找到笔记本: ${notebookName} -> ${matchedNotebook.id}`);
        return matchedNotebook.id;
      }

      console.log(`未找到名为 "${notebookName}" 的笔记本`);
      return null;
    } catch (error) {
      console.error("查找笔记本失败:", error);
      return null;
    }
  }

  // 解析每日笔记路径配置，分离笔记本名称和文档路径
  async parseDailyNotePath(template: string): Promise<{
    notebookId: string | null;
    documentPath: string;
  }> {
    console.log("解析每日笔记路径:", template);

    // 清理路径，移除前导斜杠
    const cleanTemplate = template.startsWith("/")
      ? template.substring(1)
      : template;
    const pathParts = cleanTemplate.split("/").filter((part) => part.trim());

    if (pathParts.length === 0) {
      return {
        notebookId: null,
        documentPath: "/",
      };
    }

    const firstPart = pathParts[0];

    // 尝试将第一部分作为笔记本名称查找
    const notebookId = await this.findNotebookByName(firstPart);

    if (notebookId) {
      // 如果找到了笔记本，剩余部分就是文档在笔记本内的路径
      const remainingParts = pathParts.slice(1);
      const documentPath =
        remainingParts.length > 0 ? `/${remainingParts.join("/")}` : "/";

      console.log(`解析结果:`);
      console.log(`  笔记本名称: "${firstPart}"`);
      console.log(`  笔记本ID: ${notebookId}`);
      console.log(`  文档路径: "${documentPath}" (笔记本内路径)`);

      return {
        notebookId,
        documentPath,
      };
    } else {
      // 如果没找到笔记本，整个路径都是文档路径，使用默认笔记本
      console.log(`未找到名为 "${firstPart}" 的笔记本，将使用默认笔记本`);
      return {
        notebookId: null,
        documentPath: `/${cleanTemplate}`,
      };
    }
  }

  // 渲染每日笔记路径模板
  async renderDailyNotePath(template: string): Promise<{
    notebookId: string | null;
    documentPath: string;
  }> {
    // 直接使用本地日期替换，更稳定可靠
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // 扩展模板替换，支持更多的日期格式和分层目录结构
    let renderedTemplate = template
      .replace(/\{\{now \| date "2006"\}\}/g, String(year))
      .replace(/\{\{now \| date "01"\}\}/g, month)
      .replace(/\{\{now \| date "02"\}\}/g, day)
      .replace(/\{\{now \| date "2006-01-02"\}\}/g, dateStr)
      .replace(/\{\{now \| date "2006\/01"\}\}/g, `${year}/${month}`)
      .replace(/\{\{year\}\}/g, String(year))
      .replace(/\{\{month\}\}/g, month)
      .replace(/\{\{day\}\}/g, day)
      .replace(/\{\{date\}\}/g, dateStr);

    // 如果是默认的简化模板，转换为完整的分层路径
    if (renderedTemplate === `/daily note/${dateStr}`) {
      // 将默认路径转换为正确的年/月分层结构
      renderedTemplate = `/daily note/${year}/${month}/${dateStr}`;
    }

    // 处理其他可能的简化格式，确保生成正确的分层路径
    const pathParts = renderedTemplate.split("/").filter((part) => part.trim());
    if (pathParts.length >= 2) {
      const lastPart = pathParts[pathParts.length - 1];
      // 如果最后一部分是日期格式 YYYY-MM-DD，确保有年/月分层
      if (lastPart.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const beforeLast = pathParts.slice(0, -1);
        // 检查是否已经有年月分层，如果没有则添加
        if (!pathParts.includes(String(year)) || !pathParts.includes(month)) {
          // 重构路径以包含年/月分层
          beforeLast.push(String(year));
          beforeLast.push(month);
          beforeLast.push(lastPart);
          renderedTemplate = "/" + beforeLast.join("/");
        }
      }
    }

    console.log("原始模板:", template);
    console.log("渲染后的每日笔记路径模板:", renderedTemplate);

    // 解析路径，分离笔记本和文档路径
    const result = await this.parseDailyNotePath(renderedTemplate);
    console.log("最终解析结果:", result);

    return result;
  }

  // 搜索每日笔记或创建
  async findOrCreateDailyNote(): Promise<string> {
    const today = new Date();
    // 使用本地时区的日期，避免UTC时区问题
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // 首先解析每日笔记路径配置
    const { notebookId: configuredNotebookId, documentPath } =
      await this.renderDailyNotePath(this.preferences.dailyNotePath);

    // 确定要使用的笔记本ID
    let finalNotebookId = configuredNotebookId || this.preferences.notebookId;

    if (!finalNotebookId) {
      const notebooks = await this.getNotebooks();
      if (notebooks.length === 0) {
        throw new Error("未找到任何可用的笔记本");
      }
      // 如果没有配置笔记本，使用第一个笔记本
      finalNotebookId = notebooks[0].id;
      console.log(`使用默认笔记本: ${notebooks[0].name} (${finalNotebookId})`);
    }

    if (!finalNotebookId) {
      throw new Error("无法确定目标笔记本");
    }

    console.log(`最终使用的笔记本ID: ${finalNotebookId}`);
    console.log(`文档路径: ${documentPath}`);

    // 优化搜索逻辑，使用更精确的路径匹配
    try {
      // 构建更精确的路径搜索条件
      const searchPaths = [
        `%${dateStr}%`, // 精确日期匹配
        `%${dateStr}`, // 以日期结尾
        `${dateStr}%`, // 以日期开头
      ];

      // 在确定的笔记本中搜索
      const notebookFilter = `AND box = '${finalNotebookId}'`;

      // 首先尝试通过hpath精确匹配
      for (const searchPath of searchPaths) {
        const sql = `SELECT * FROM blocks WHERE type='d' AND hpath LIKE '${searchPath}' ${notebookFilter} ORDER BY updated DESC LIMIT 3`;
        console.log("搜索每日笔记SQL:", sql);

        const response = await this.request<SiYuanBlock[]>("/query/sql", {
          stmt: sql,
        });

        if (response && response.length > 0) {
          // 找到了可能的今日笔记，进一步验证
          for (const block of response) {
            if (
              block.hpath &&
              (block.hpath.includes(dateStr) ||
                block.content?.includes(dateStr))
            ) {
              console.log(
                "通过SQL找到每日笔记:",
                block.id,
                "路径:",
                block.hpath,
              );
              return block.id;
            }
          }
        }
      }

      // 如果精确匹配失败，尝试内容匹配
      const contentSql = `SELECT * FROM blocks WHERE type='d' AND content LIKE '%${dateStr}%' ${notebookFilter} ORDER BY updated DESC LIMIT 5`;
      console.log("通过内容搜索每日笔记SQL:", contentSql);

      const contentResponse = await this.request<SiYuanBlock[]>("/query/sql", {
        stmt: contentSql,
      });

      if (contentResponse && contentResponse.length > 0) {
        for (const block of contentResponse) {
          if (block.content && block.content.includes(`每日笔记 ${dateStr}`)) {
            console.log(
              "通过内容找到每日笔记:",
              block.id,
              "标题:",
              block.content,
            );
            return block.id;
          }
        }
      }
    } catch (error) {
      console.log("SQL搜索每日笔记失败:", error);
    }

    // 没找到，创建新的每日笔记
    console.log("创建新的每日笔记");
    console.log("目标笔记本ID:", finalNotebookId);
    console.log("文档路径:", documentPath);

    try {
      // 创建每日笔记，确保添加daily note特有的属性
      const docId = await this.createDailyNote({
        notebook: finalNotebookId,
        path: documentPath,
        title: `每日笔记 ${dateStr}`,
        content: `> 📅 ${new Date().toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}\n\n`,
        date: dateStr,
      });

      console.log("成功创建每日笔记:", docId);
      return docId;
    } catch (error) {
      console.error("创建每日笔记失败:", error);
      throw new Error(
        `创建每日笔记失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  // 添加内容到每日笔记
  async addToDailyNote(
    content: string,
    addTimestamp: boolean = true,
  ): Promise<void> {
    const dailyNoteId = await this.findOrCreateDailyNote();

    let formattedContent = content;

    if (addTimestamp) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      formattedContent = `**${timestamp}** ${content}`;
    }

    // 添加换行确保格式正确
    const contentToAdd = `\n${formattedContent}\n`;

    await this.appendBlock(dailyNoteId, contentToAdd);
  }

  // 添加内容到指定文档
  async addToDocument(
    documentId: string,
    content: string,
    addTimestamp: boolean = true,
  ): Promise<void> {
    if (!documentId || !documentId.trim()) {
      throw new Error("文档ID不能为空");
    }

    if (!content || !content.trim()) {
      throw new Error("内容不能为空");
    }

    // 首先验证文档是否存在
    try {
      await this.getBlockInfo(documentId);
    } catch (error) {
      throw new Error(
        `文档不存在或无法访问: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }

    let formattedContent = content.trim();

    if (addTimestamp) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      formattedContent = `**${timestamp}** ${content.trim()}`;
    }

    // 添加换行确保格式正确
    const contentToAdd = `\n${formattedContent}\n`;

    await this.appendBlock(documentId, contentToAdd);
  }

  // 获取用户最近编辑的文档ID（用于快速添加的默认目标）
  async getMostRecentDocumentId(): Promise<string | null> {
    try {
      const recentDocs = await this.getRecentDocs();
      return recentDocs.length > 0 ? recentDocs[0].id : null;
    } catch (error) {
      console.error("获取最近文档失败:", error);
      return null;
    }
  }

  // ======== 笔记漫游功能 ========

  // 随机获取文档
  async getRandomDocuments(limit: number = 1): Promise<SiYuanBlock[]> {
    console.log(`获取随机文档，数量: ${limit}`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 使用随机排序获取文档
    const sql = `
      SELECT * FROM blocks 
      WHERE type = 'd' 
      ORDER BY RANDOM() 
      LIMIT ${limit}
    `;

    console.log("随机文档SQL:", sql);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加笔记本信息
    const docs = (response || []).map((doc) => {
      const notebookName = notebookMap.get(doc.box) || "未知笔记本";
      return {
        ...doc,
        notebook_name: notebookName,
        notebook_id: doc.box,
        isDocument: true,
      };
    });

    console.log("随机文档结果:", docs);
    return docs;
  }

  // 随机获取块
  async getRandomBlocks(limit: number = 1): Promise<SiYuanBlock[]> {
    console.log(`获取随机块，数量: ${limit}`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 使用随机排序获取块（排除文档类型）
    const sql = `
      SELECT 
        b.*,
        doc.content as doc_title,
        doc.hpath as doc_path
      FROM blocks b
      LEFT JOIN blocks doc ON b.root_id = doc.id AND doc.type = 'd'
      WHERE b.type != 'd' 
        AND b.content != ''
        AND LENGTH(b.content) > 10
      ORDER BY RANDOM() 
      LIMIT ${limit}
    `;

    console.log("随机块SQL:", sql);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加文档标题和笔记本信息
    const blocks = (response || []).map((block) => {
      const notebookName = notebookMap.get(block.box) || "未知笔记本";
      return {
        ...block,
        doc_title:
          (block as SiYuanBlock & { doc_title?: string }).doc_title ||
          block.content,
        doc_path:
          (block as SiYuanBlock & { doc_path?: string }).doc_path ||
          block.hpath,
        notebook_name: notebookName,
        notebook_id: block.box,
        isDocument: false,
      };
    });

    console.log("随机块结果:", blocks);
    return blocks;
  }

  // 获取年老笔记（X个月或X年前的文档）
  async getOldNotes(
    timeType: "months" | "years",
    timeValue: number,
    limit: number = 10,
  ): Promise<SiYuanBlock[]> {
    console.log(`获取年老笔记: ${timeValue} ${timeType} 前的文档`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 计算目标时间点
    const now = new Date();
    const targetDate = new Date(now);

    if (timeType === "months") {
      targetDate.setMonth(now.getMonth() - timeValue);
    } else {
      targetDate.setFullYear(now.getFullYear() - timeValue);
    }

    // 思源笔记使用14位字符串时间戳格式 YYYYMMDDHHMMSS
    const formatTimestamp = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}000000`; // 设置为当天开始
    };

    // 计算时间范围
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999); // 设置为当天结束
    const endTimestamp = formatTimestamp(endDate);

    // 设置开始时间（前一个月或半年）
    const startDate = new Date(targetDate);
    if (timeType === "months") {
      startDate.setMonth(targetDate.getMonth() - 1);
    } else {
      startDate.setMonth(targetDate.getMonth() - 6);
    }
    const startTimestamp = formatTimestamp(startDate);

    // 查询年老笔记，只查找创建时间在指定范围内且很久没有修改的文档
    const sql = `
      SELECT * FROM blocks 
      WHERE type = 'd' 
        AND created BETWEEN '${startTimestamp}' AND '${endTimestamp}'
        AND (updated = created OR updated < '${endTimestamp}')
      ORDER BY created DESC 
      LIMIT ${limit}
    `;

    console.log("年老笔记SQL:", sql);
    console.log("时间范围:", startTimestamp, "到", endTimestamp);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加笔记本信息
    const docs = (response || []).map((doc) => {
      const notebookName = notebookMap.get(doc.box) || "未知笔记本";
      return {
        ...doc,
        notebook_name: notebookName,
        notebook_id: doc.box,
        isDocument: true,
      };
    });

    console.log("年老笔记结果:", docs);
    return docs;
  }

  // 获取所有标签
  async getAllTags(): Promise<string[]> {
    console.log("获取所有标签");

    const sql = `
      SELECT DISTINCT tag FROM blocks 
      WHERE tag != '' AND tag IS NOT NULL
      ORDER BY tag
    `;

    console.log("标签查询SQL:", sql);

    const response = await this.request<Array<{ tag: string }>>("/query/sql", {
      stmt: sql,
    });

    // 处理标签字符串，可能包含多个标签用空格分隔
    const allTags = new Set<string>();
    (response || []).forEach((item) => {
      if (item.tag && item.tag.trim()) {
        // 标签可能是 "tag1 tag2 tag3" 的格式，需要分割
        const tags = item.tag.split(/\s+/).filter((t) => t.startsWith("#"));
        tags.forEach((tag) => {
          if (tag.length > 1) {
            // 过滤掉单独的 # 号
            allTags.add(tag);
          }
        });
      }
    });

    const result = Array.from(allTags).sort();
    console.log("所有标签:", result);
    return result;
  }

  // 根据标签获取相关的文档
  async getDocumentsByTag(
    tag: string,
    limit: number = 10,
  ): Promise<SiYuanBlock[]> {
    console.log(`根据标签获取文档: ${tag}`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 清理标签（确保以#开头）
    const cleanTag = tag.startsWith("#") ? tag : `#${tag}`;

    const sql = `
      SELECT DISTINCT d.* FROM blocks d
      WHERE d.type = 'd' 
        AND (d.tag LIKE '%${cleanTag}%' OR d.content LIKE '%${cleanTag}%')
      ORDER BY d.updated DESC 
      LIMIT ${limit}
    `;

    console.log("标签文档查询SQL:", sql);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加笔记本信息
    const docs = (response || []).map((doc) => {
      const notebookName = notebookMap.get(doc.box) || "未知笔记本";
      return {
        ...doc,
        notebook_name: notebookName,
        notebook_id: doc.box,
        isDocument: true,
      };
    });

    console.log("标签文档结果:", docs);
    return docs;
  }

  // 根据文档ID获取该文档的所有块（用于文档内随机漫游）
  async getBlocksByDocumentId(
    docId: string,
    limit: number = 20,
  ): Promise<SiYuanBlock[]> {
    console.log(`获取文档内的块: ${docId}`);

    // 首先获取笔记本列表来创建映射
    const notebooks = await this.getNotebooks();
    const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

    // 先获取文档信息
    const docSql = `
      SELECT content, hpath FROM blocks 
      WHERE id = '${docId}' AND type = 'd'
    `;

    const docResponse = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: docSql,
    });

    if (!docResponse || docResponse.length === 0) {
      return [];
    }

    const doc = docResponse[0];
    const docTitle = doc.content || "未知文档";
    const docPath = doc.hpath || "";

    // 获取文档下的所有内容块
    const sql = `
      SELECT * FROM blocks 
      WHERE root_id = '${docId}' 
        AND type != 'd'
        AND content != ''
        AND LENGTH(content) > 5
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;

    console.log("文档块查询SQL:", sql);

    const response = await this.request<SiYuanBlock[]>("/query/sql", {
      stmt: sql,
    });

    // 转换为预期的格式，添加文档标题和笔记本信息
    const blocks = (response || []).map((block) => {
      const notebookName = notebookMap.get(block.box) || "未知笔记本";
      return {
        ...block,
        doc_title: docTitle,
        doc_path: docPath,
        notebook_name: notebookName,
        notebook_id: block.box,
        isDocument: false,
      };
    });

    console.log("文档块结果:", blocks);
    return blocks;
  }

  // ======== Assets 附件管理功能 ========

  // 读取 assets 文件夹内容
  async readAssetsDir(): Promise<AssetFile[]> {
    console.log("读取 assets 文件夹内容");

    try {
      // 直接使用文件系统读取，而不是通过 SiYuan API
      const assetsPath = this.getAssetsDirectoryPath();
      if (!assetsPath) {
        throw new Error("无法确定 assets 文件夹路径，请检查工作空间配置");
      }

      console.log(`Assets 文件夹路径: ${assetsPath}`);

      const fs = await import("fs/promises");
      const path = await import("path");

      // 检查文件夹是否存在
      try {
        await fs.access(assetsPath);
      } catch {
        console.warn(`Assets 文件夹不存在: ${assetsPath}`);
        return [];
      }

      // 读取文件夹内容
      const files = await fs.readdir(assetsPath, { withFileTypes: true });

      const assetFiles: AssetFile[] = [];

      for (const file of files) {
        // 只处理文件，跳过文件夹
        if (file.isFile()) {
          const filePath = path.join(assetsPath, file.name);

          try {
            const stats = await fs.stat(filePath);

            assetFiles.push({
              name: file.name,
              path: `assets/${file.name}`, // 相对路径
              size: stats.size,
              modTime: stats.mtime.toISOString(),
              isDir: false,
              isAsset: true,
              extension: this.getFileExtension(file.name),
              type: this.getFileType(file.name),
              fullPath: filePath, // 绝对路径
            });
          } catch (error) {
            console.warn(`无法获取文件信息: ${file.name}`, error);
          }
        }
      }

      console.log(`找到 ${assetFiles.length} 个文件`);
      return assetFiles;
    } catch (error) {
      console.error("读取 assets 文件夹失败:", error);
      return [];
    }
  }

  // 获取 assets 文件夹的绝对路径
  private getAssetsDirectoryPath(): string | null {
    // 如果用户配置了工作空间路径，使用配置的路径
    if (this.preferences.workspacePath) {
      const workspacePath = this.preferences.workspacePath.replace(/\/$/, ""); // 移除末尾斜杠
      return `${workspacePath}/data/assets`;
    }

    // 回退到常见的SiYuan数据目录位置
    const userHome =
      process.env.HOME || process.env.USERPROFILE || "/Users/用户名";
    const possiblePaths = [
      `${userHome}/Documents/SiYuan/data/assets`,
      `${userHome}/SiYuan/data/assets`,
      `${userHome}/.siyuan/data/assets`,
      `${userHome}/Library/Application Support/SiYuan/data/assets`,
      `${userHome}/AppData/Roaming/SiYuan/data/assets`, // Windows
    ];

    // 返回第一个可能的路径
    return possiblePaths[0];
  }

  // 获取文件扩展名
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.substring(lastDot + 1).toLowerCase() : "";
  }

  // 根据文件扩展名判断文件类型
  private getFileType(
    fileName: string,
  ): "image" | "document" | "archive" | "video" | "audio" | "other" {
    const ext = this.getFileExtension(fileName);

    if (
      ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"].includes(ext)
    ) {
      return "image";
    }
    if (["pdf", "doc", "docx", "txt", "md", "rtf", "odt"].includes(ext)) {
      return "document";
    }
    if (["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)) {
      return "archive";
    }
    if (["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(ext)) {
      return "video";
    }
    if (["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(ext)) {
      return "audio";
    }
    return "other";
  }

  // 查找单个附件的引用信息（简化版本）
  async findAssetReference(assetName: string): Promise<{
    doc_id: string;
    doc_title: string;
    doc_path: string;
    updated: string;
  } | null> {
    console.log(`查找附件引用信息: ${assetName}`);

    try {
      // 使用简单的查询，只查找最新的一个引用
      const sql = `
        SELECT DISTINCT 
          d.id as doc_id, 
          d.content as doc_title, 
          d.hpath as doc_path, 
          d.updated
        FROM blocks b
        LEFT JOIN blocks d ON b.root_id = d.id AND d.type = 'd'
        WHERE d.id IS NOT NULL 
          AND (b.content LIKE '%assets/${assetName}%' OR b.markdown LIKE '%assets/${assetName}%')
        ORDER BY d.updated DESC
        LIMIT 1
      `;

      const response = await this.request<
        Array<{
          doc_id: string;
          doc_title: string;
          doc_path: string;
          updated: string;
        }>
      >("/query/sql", { stmt: sql });

      return response && response.length > 0 ? response[0] : null;
    } catch (error) {
      console.error("查找引用文档失败:", error);
      return null;
    }
  }

  // 搜索和过滤 assets 文件
  async searchAssets(
    query: string = "",
    fileType?: "image" | "document" | "archive" | "video" | "audio" | "other",
  ): Promise<AssetFile[]> {
    console.log(`搜索 assets 文件: "${query}", 类型: ${fileType}`);

    const allFiles = await this.readAssetsDir();

    // 过滤掉 SiYuan 内部文件和应用过滤条件
    const filteredFiles = allFiles.filter((file) => {
      // 过滤掉 .sya 文件（SiYuan 内部文件）
      if (file.extension === "sya") {
        return false;
      }

      // 按文件名搜索
      const nameMatch =
        !query || file.name.toLowerCase().includes(query.toLowerCase());

      // 按文件类型过滤
      const typeMatch = !fileType || file.type === fileType;

      return nameMatch && typeMatch;
    });

    // 只返回基本文件信息，不立即查询引用（性能优化）
    // 引用信息将在用户真正需要时懒加载
    const filesWithRefs = filteredFiles.map((file) => {
      return {
        ...file,
        referencedBy: null,
        referencedByPath: null,
        referencedByDocId: null,
        lastReferencedTime: null,
      };
    });

    return filesWithRefs;
  }

  // 设置块属性
  async setBlockAttribute(
    blockId: string,
    name: string,
    value: string,
  ): Promise<void> {
    try {
      console.log(`设置块属性: ${blockId}, ${name}=${value}`);

      await this.request("/attr/setBlockAttrs", {
        id: blockId,
        attrs: {
          [name]: value,
        },
      });

      console.log(`成功设置块属性: ${blockId}`);
    } catch (error) {
      console.error("设置块属性失败:", error);
      throw error;
    }
  }

  // 获取块属性
  async getBlockAttributes(blockId: string): Promise<Record<string, string>> {
    try {
      console.log(`获取块属性: ${blockId}`);

      const response = await this.request<Record<string, string>>(
        "/attr/getBlockAttrs",
        {
          id: blockId,
        },
      );

      return response || {};
    } catch (error) {
      console.error("获取块属性失败:", error);
      return {};
    }
  }

  // 为块添加引用记录
  async addReferenceRecord(
    blockId: string,
    appName: string,
    timestamp?: string,
  ): Promise<void> {
    try {
      const currentTimestamp = timestamp || new Date().toISOString();
      const humanReadableTime = this.formatHumanReadableTime(currentTimestamp);
      const referenceKey = `custom-reference-${Date.now()}`;
      const referenceValue = `${appName}|${humanReadableTime}|${currentTimestamp}`;

      // 首先获取现有的引用记录
      const existingAttrs = await this.getBlockAttributes(blockId);
      const existingReferences = Object.keys(existingAttrs)
        .filter((key) => key.startsWith("custom-reference-"))
        .map((key) => existingAttrs[key]);

      // 检查是否已经有相同应用的最近引用（5分钟内）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const hasRecentReference = existingReferences.some((ref) => {
        const parts = ref.split("|");
        const refApp = parts[0];
        const refIsoTime = parts[2] || parts[1]; // 兼容旧格式
        return refApp === appName && refIsoTime > fiveMinutesAgo;
      });

      if (!hasRecentReference) {
        await this.setBlockAttribute(blockId, referenceKey, referenceValue);

        // 为块添加书签属性
        await this.addBookmarkToBlock(blockId);

        console.log(`为块 ${blockId} 添加引用记录: ${appName}`);
      } else {
        console.log(`块 ${blockId} 最近已有 ${appName} 的引用记录，跳过添加`);
      }
    } catch (error) {
      console.error("添加引用记录失败:", error);
      throw error;
    }
  }

  // 获取块的所有引用记录
  async getBlockReferences(
    blockId: string,
  ): Promise<Array<{ app: string; timestamp: string; isoTimestamp?: string }>> {
    try {
      const attrs = await this.getBlockAttributes(blockId);
      const references = Object.keys(attrs)
        .filter((key) => key.startsWith("custom-reference-"))
        .map((key) => {
          const parts = attrs[key].split("|");
          const app = parts[0];
          const humanTime = parts[1];
          const isoTime = parts[2] || parts[1]; // 兼容旧格式

          return {
            app,
            timestamp: humanTime,
            isoTimestamp: isoTime,
          };
        })
        .sort((a, b) => {
          // 按ISO时间戳排序（更准确）
          const timeA = (a as any).isoTimestamp || a.timestamp;
          const timeB = (b as any).isoTimestamp || b.timestamp;
          return timeB.localeCompare(timeA);
        });

      return references;
    } catch (error) {
      console.error("获取引用记录失败:", error);
      return [];
    }
  }

  // 格式化时间为人类友好的格式
  private formatHumanReadableTime(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // 为块添加书签属性到思源笔记中
  private async addBookmarkToBlock(blockId: string): Promise<void> {
    try {
      console.log(`为块 ${blockId} 添加书签属性`);

      // 检查是否已经有书签属性
      const existingAttrs = await this.getBlockAttributes(blockId);
      if (existingAttrs.bookmark) {
        console.log(`块 ${blockId} 已经有书签属性`);
        return;
      }

      // 添加书签属性
      await this.setBlockAttribute(blockId, "bookmark", "🔖 引用书签");
      console.log(`成功为块 ${blockId} 添加书签属性`);
    } catch (error) {
      console.error(`为块 ${blockId} 添加书签属性失败:`, error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 检查块是否有引用记录
  async hasReferences(blockId: string): Promise<boolean> {
    try {
      // 检查属性中的引用记录和书签属性
      const attrs = await this.getBlockAttributes(blockId);
      const hasAttrRefs = Object.keys(attrs).some((key) =>
        key.startsWith("custom-reference-"),
      );
      const hasBookmark = Boolean(attrs.bookmark);

      // 如果有引用记录且有书签属性，返回true
      return hasAttrRefs && hasBookmark;
    } catch (error) {
      console.error("检查引用记录失败:", error);
      return false;
    }
  }

  // 获取块的引用统计信息
  async getReferenceStats(blockId: string): Promise<{
    totalReferences: number;
    uniqueApps: number;
    lastReferenceTime?: string;
    appCounts: Record<string, number>;
  }> {
    try {
      const references = await this.getBlockReferences(blockId);

      const appCounts: Record<string, number> = {};
      references.forEach((ref) => {
        appCounts[ref.app] = (appCounts[ref.app] || 0) + 1;
      });

      return {
        totalReferences: references.length,
        uniqueApps: Object.keys(appCounts).length,
        lastReferenceTime:
          references.length > 0 ? references[0].timestamp : undefined,
        appCounts,
      };
    } catch (error) {
      console.error("获取引用统计失败:", error);
      return {
        totalReferences: 0,
        uniqueApps: 0,
        appCounts: {},
      };
    }
  }
}

export const siyuanAPI = new SiYuanAPI();
