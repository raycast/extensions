import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getDeviceInfo } from "./localsend";
import { PrepareUploadRequest, PrepareUploadResponse, FileMetadata } from "../types";

const SERVER_STATUS_KEY = "receive-server-status";

interface Preferences {
  downloadPath: string;
  enableReceive: boolean;
}

interface Session {
  sessionId: string;
  files: Record<string, { token: string; metadata: FileMetadata }>;
  receivedFiles: Set<string>;
}

let server: http.Server | null = null;
const sessions = new Map<string, Session>();

const setServerRunning = async (running: boolean) => {
  await LocalStorage.setItem(SERVER_STATUS_KEY, running);
};

const expandPath = (filePath: string): string => {
  if (filePath.startsWith("~")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
};

const getDownloadPath = async (): Promise<string> => {
  const prefs = getPreferenceValues<Preferences>();
  const downloadPath = expandPath(prefs.downloadPath || "~/Downloads");

  try {
    await fs.access(downloadPath);
  } catch {
    await fs.mkdir(downloadPath, { recursive: true });
  }

  return downloadPath;
};

const handlePrepareUpload = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const request = JSON.parse(body) as PrepareUploadRequest;
    const sessionId = Math.random().toString(36).substring(7);
    const fileTokens: Record<string, string> = {};

    const sessionFiles: Record<string, { token: string; metadata: FileMetadata }> = {};

    for (const [fileId, fileMetadata] of Object.entries(request.files)) {
      const token = Math.random().toString(36).substring(7);
      fileTokens[fileId] = token;
      sessionFiles[fileId] = { token, metadata: fileMetadata };
    }

    sessions.set(sessionId, {
      sessionId,
      files: sessionFiles,
      receivedFiles: new Set(),
    });

    const response: PrepareUploadResponse = {
      sessionId,
      files: fileTokens,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error("Error in prepare upload:", error);
    res.writeHead(500);
    res.end();
  }
};

const handleUpload = async (req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> => {
  const sessionId = url.searchParams.get("sessionId");
  const fileId = url.searchParams.get("fileId");
  const token = url.searchParams.get("token");

  if (!sessionId || !fileId || !token) {
    res.writeHead(400);
    res.end("Missing parameters");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.writeHead(404);
    res.end("Session not found");
    return;
  }

  const fileInfo = session.files[fileId];
  if (!fileInfo || fileInfo.token !== token) {
    res.writeHead(403);
    res.end("Invalid token");
    return;
  }

  try {
    const downloadPath = await getDownloadPath();
    const fileName = fileInfo.metadata.fileName;
    const filePath = path.join(downloadPath, fileName);

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const fileData = Buffer.concat(chunks);

    await fs.writeFile(filePath, fileData);
    session.receivedFiles.add(fileId);

    res.writeHead(200);
    res.end();

    if (session.receivedFiles.size === Object.keys(session.files).length) {
      sessions.delete(sessionId);
    }
  } catch (error) {
    console.error("Error saving file:", error);
    res.writeHead(500);
    res.end();
  }
};

const handleInfo = (req: http.IncomingMessage, res: http.ServerResponse): void => {
  const deviceInfo = getDeviceInfo();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(deviceInfo));
};

const handleRegister = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
  const deviceInfo = getDeviceInfo();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(deviceInfo));
};

export const startReceiveServer = async (port: number): Promise<http.Server> => {
  if (server) {
    return server;
  }

  server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/localsend/v2/prepare-upload" && req.method === "POST") {
      await handlePrepareUpload(req, res);
    } else if (url.pathname === "/api/localsend/v2/upload" && req.method === "POST") {
      await handleUpload(req, res, url);
    } else if (url.pathname === "/api/localsend/v2/info" && req.method === "GET") {
      handleInfo(req, res);
    } else if (url.pathname === "/api/localsend/v2/register" && req.method === "POST") {
      await handleRegister(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve, reject) => {
    server!.listen(port, () => {
      console.log(`LocalSend receive server listening on port ${port}`);
      setServerRunning(true);
      resolve(server!);
    });

    server!.on("error", (error) => {
      console.error("Server error:", error);
      setServerRunning(false);
      reject(error);
    });
  });
};

export const stopReceiveServer = async (): Promise<void> => {
  if (!server) {
    await setServerRunning(false);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    server!.close(() => {
      server = null;
      sessions.clear();
      setServerRunning(false);
      resolve();
    });
  });
};

export const isServerRunning = async (): Promise<boolean> => {
  const status = await LocalStorage.getItem<boolean>(SERVER_STATUS_KEY);
  return status === true;
};
