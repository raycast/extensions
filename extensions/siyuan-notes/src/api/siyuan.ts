import axios, { AxiosInstance } from "axios";
import { getPreferenceValues } from "@raycast/api";
import {
  SiYuanApiResponse,
  SiYuanSearchResult,
  SiYuanNotebook,
  SiYuanTemplate,
  CreateNoteParams,
  SiYuanBlock,
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
    const response = await this.request<{ id: string }>(
      "/filetree/createDocWithMd",
      {
        notebook: params.notebook,
        path: params.path,
        markdown: params.content || "",
      },
    );

    return response.id;
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

  // 渲染每日笔记路径模板
  async renderDailyNotePath(template: string): Promise<string> {
    // 直接使用本地日期替换，更稳定可靠
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const result = template
      .replace(/\{\{now \| date "2006"\}\}/g, String(year))
      .replace(/\{\{now \| date "01"\}\}/g, month)
      .replace(/\{\{now \| date "02"\}\}/g, day)
      .replace(/\{\{now \| date "2006-01-02"\}\}/g, dateStr)
      .replace(/\{\{now \| date "2006\/01"\}\}/g, `${year}/${month}`)
      .replace(/\{\{date\}\}/g, dateStr);

    console.log("渲染后的每日笔记路径:", result);
    return result;
  }

  // 搜索每日笔记或创建
  async findOrCreateDailyNote(): Promise<string> {
    const today = new Date();
    // 使用本地时区的日期，避免UTC时区问题
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // 直接通过SQL查询搜索包含今日日期的文档，更稳定可靠
    try {
      const sql = `SELECT * FROM blocks WHERE type='d' AND (content LIKE '%${dateStr}%' OR hpath LIKE '%${dateStr}%') ORDER BY updated DESC LIMIT 5`;
      const response = await this.request<SiYuanBlock[]>("/query/sql", {
        stmt: sql,
      });

      if (response && response.length > 0) {
        // 找到了可能的今日笔记，验证是否真的是今日笔记
        for (const block of response) {
          if (block.hpath && block.hpath.includes(dateStr)) {
            console.log("通过SQL找到每日笔记:", block.id);
            return block.id;
          }
        }
      }
    } catch (error) {
      console.log("SQL搜索每日笔记失败:", error);
    }

    // 没找到，创建新的每日笔记
    const notebooks = await this.getNotebooks();
    const defaultNotebook = this.preferences.notebookId || notebooks[0]?.id;

    if (!defaultNotebook) {
      throw new Error("未找到可用的笔记本");
    }

    // 渲染每日笔记路径
    const dailyPath = await this.renderDailyNotePath(
      this.preferences.dailyNotePath,
    );

    console.log("创建新的每日笔记，路径:", dailyPath);
    const docId = await this.createNote({
      notebook: defaultNotebook,
      path: dailyPath,
      title: `每日笔记 ${dateStr}`,
      content: `# 每日笔记 ${dateStr}\n\n> 📅 ${new Date().toLocaleDateString(
        "zh-CN",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        },
      )}\n\n`,
    });

    return docId;
  }

  // 添加内容到每日笔记
  async addToDailyNote(
    content: string,
    addTimestamp: boolean = true,
  ): Promise<void> {
    const dailyNoteId = await this.findOrCreateDailyNote();

    let formattedContent = content;

    if (addTimestamp) {
      const timestamp = new Date().toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      formattedContent = `**${timestamp}** ${content}`;
    }

    // 添加换行确保格式正确
    const contentToAdd = `\n${formattedContent}\n`;

    await this.appendBlock(dailyNoteId, contentToAdd);
  }
}

export const siyuanAPI = new SiYuanAPI();
