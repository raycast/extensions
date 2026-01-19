import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { getDeviceInfo } from "./localsend";
import { PrepareUploadRequest, PrepareUploadResponse, FileMetadata, PendingTransfer } from "../types";
import { isFavoriteDevice } from "./favorites";

const SERVER_STATUS_KEY = "receive-server-status";
const PENDING_TRANSFERS_KEY = "pending-transfers";

interface Session {
  sessionId: string;
  files: Record<string, { token: string; metadata: FileMetadata }>;
  receivedFiles: Set<string>;
  pendingTransferId?: string;
}

interface PendingRequest {
  response: http.ServerResponse;
  request: PrepareUploadRequest;
  transferId: string;
}

let server: http.Server | null = null;
const sessions = new Map<string, Session>();
const pendingTransfers = new Map<string, PendingTransfer>();
const pendingRequests = new Map<string, PendingRequest>();

const setServerRunning = async (running: boolean) => {
  await LocalStorage.setItem(SERVER_STATUS_KEY, running);
};

export const getPendingTransfers = async (): Promise<PendingTransfer[]> => {
  try {
    const stored = await LocalStorage.getItem<string>(PENDING_TRANSFERS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const savePendingTransfers = async (transfers: PendingTransfer[]) => {
  await LocalStorage.setItem(PENDING_TRANSFERS_KEY, JSON.stringify(transfers));
};

export const acceptPendingTransfer = async (transferId: string): Promise<boolean> => {
  const transfers = await getPendingTransfers();
  const transfer = transfers.find((t) => t.id === transferId);

  if (!transfer || transfer.status !== "pending") {
    return false;
  }

  transfer.status = "accepted";
  await savePendingTransfers(transfers);

  // If we have a pending HTTP request, respond now
  const pendingReq = pendingRequests.get(transferId);
  if (pendingReq) {
    const sessionId = Math.random().toString(36).substring(7);
    const fileTokens: Record<string, string> = {};
    const sessionFiles: Record<string, { token: string; metadata: FileMetadata }> = {};

    for (const [fileId, fileMetadata] of Object.entries(pendingReq.request.files)) {
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

    pendingReq.response.writeHead(200, { "Content-Type": "application/json" });
    pendingReq.response.end(JSON.stringify(response));
    pendingRequests.delete(transferId);
  }

  return true;
};

export const rejectPendingTransfer = async (transferId: string): Promise<boolean> => {
  const transfers = await getPendingTransfers();
  const transfer = transfers.find((t) => t.id === transferId);

  if (!transfer || transfer.status !== "pending") {
    return false;
  }

  transfer.status = "rejected";
  await savePendingTransfers(transfers);

  // Clean up any associated session
  sessions.forEach((session, sessionId) => {
    if (session.pendingTransferId === transferId) {
      sessions.delete(sessionId);
    }
  });

  // If we have a pending HTTP request, respond with 403
  const pendingReq = pendingRequests.get(transferId);
  if (pendingReq) {
    pendingReq.response.writeHead(403, { "Content-Type": "application/json" });
    pendingReq.response.end(JSON.stringify({ error: "Transfer rejected by user" }));
    pendingRequests.delete(transferId);
  }

  pendingTransfers.delete(transferId);

  return true;
};

export const clearCompletedTransfers = async () => {
  const transfers = await getPendingTransfers();
  const activeTransfers = transfers.filter((t) => t.status === "pending");
  await savePendingTransfers(activeTransfers);
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

    // Get Quick Save setting - check LocalStorage first, then preferences
    const storedMode = await LocalStorage.getItem<string>("quick-save-mode");
    const prefs = getPreferenceValues<Preferences>();
    const quickSave = (storedMode as "off" | "favorites" | "on") || prefs.quickSave || "off";

    // Get sender info from request
    const senderAlias = request.info?.alias || "Unknown Device";
    const senderFingerprint = request.info?.fingerprint;

    let shouldAccept = false;

    if (quickSave === "on") {
      // Auto-accept from everyone
      shouldAccept = true;
    } else if (quickSave === "favorites" && senderFingerprint) {
      // Check if sender is a favorite
      shouldAccept = await isFavoriteDevice(senderFingerprint);

      if (!shouldAccept) {
        // Reject - not a favorite
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Only accepting files from favorites" }));
        return;
      }
    } else {
      // Quick Save is "off" - store request and DON'T respond yet
      // Keep HTTP connection open until user accepts/rejects
      const transferId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const pendingTransfer: PendingTransfer = {
        id: transferId,
        senderAlias,
        senderFingerprint,
        files: request.files,
        timestamp: Date.now(),
        status: "pending",
      };

      // Store in memory for immediate access
      pendingTransfers.set(transferId, pendingTransfer);

      // Save to LocalStorage for UI
      const allTransfers = await getPendingTransfers();
      allTransfers.unshift(pendingTransfer);
      await savePendingTransfers(allTransfers);

      // Store the HTTP response object - we'll respond later when user accepts/rejects
      pendingRequests.set(transferId, {
        response: res,
        request,
        transferId,
      });

      // Don't close the connection - it stays open until user decision
      // The sender will see "waiting for response" status

      return;
    }

    // Accept the transfer (auto-accept mode)
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

    // Show notification that we're receiving
    const fileCount = Object.keys(request.files).length;
    // Don't use showHUD - it closes the window
    await showToast({
      style: Toast.Style.Success,
      title: "Receiving files",
      message: `${fileCount} file${fileCount !== 1 ? "s" : ""} from ${senderAlias}`,
    });
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

    // If all files received, show notification and clean up
    if (session.receivedFiles.size === Object.keys(session.files).length) {
      await showToast({
        style: Toast.Style.Success,
        title: "Files received",
        message: `${Object.keys(session.files).length} file(s) saved`,
      });
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
