import fetch from "node-fetch";
import crypto from "crypto";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

export interface AnalysisStats {
  malicious: number;
  suspicious: number;
  undetected: number;
  harmless: number;
  timeout: number;
  [key: string]: number;
}

interface AnalysisAttributes {
  status: string;
  stats: AnalysisStats;
}

interface AnalysisData {
  id: string;
  attributes: AnalysisAttributes;
}

export interface AnalysisResponse {
  data: AnalysisData;
}

interface FileReportAttributes {
  last_analysis_stats: AnalysisStats;
}

interface FileReportData {
  id: string;
  attributes: FileReportAttributes;
}

export interface FileReport {
  data: FileReportData;
}

interface UrlReportData {
  id: string;
  attributes: {
    last_analysis_stats: AnalysisStats;
  };
}

export interface UrlReport {
  data: UrlReportData;
}

interface UploadData {
  data: {
    id: string;
  };
}

interface SubmitUrlData {
  data: {
    id: string;
  };
}

const preferences = getPreferenceValues<Preferences>();
const API_KEY = preferences.apiKey;
export const BASE_URL = "https://www.virustotal.com/api/v3";

if (!API_KEY || API_KEY.trim() === "") {
  throw new Error("VirusTotal API key is missing. Please add it in the extension preferences.");
}

export async function getFileReport(hash: string): Promise<FileReport | null> {
  const response = await fetch(`${BASE_URL}/files/${hash}`, {
    method: "GET",
    headers: {
      "x-apikey": API_KEY,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`VirusTotal API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<FileReport>;
}

export async function uploadFile(fileBuffer: Buffer, fileName: string): Promise<string> {
  const fileSize = fileBuffer.length;
  const maxSizeBytes = 32 * 1024 * 1024; // 32MB - VT's file size limit

  if (fileSize > maxSizeBytes) {
    throw new Error(`File size (${(fileSize / (1024 * 1024)).toFixed(2)}MB) exceeds the 32MB limit.`);
  }

  // Upload file directly
  const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString("hex")}`;
  const formDataHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const formDataFooter = `\r\n--${boundary}--\r\n`;

  const requestBody = Buffer.concat([
    Buffer.from(formDataHeader, "utf8"),
    fileBuffer,
    Buffer.from(formDataFooter, "utf8"),
  ]);

  // Upload the file
  const uploadResponse = await fetch(`${BASE_URL}/files`, {
    method: "POST",
    headers: {
      "x-apikey": API_KEY,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": requestBody.length.toString(),
    },
    body: requestBody,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }

  const uploadData = (await uploadResponse.json()) as UploadData;
  return uploadData.data.id;
}

export async function getURLReport(url: string): Promise<UrlReport> {
  // First, we need to submit the URL for analysis
  const formData = new URLSearchParams();
  formData.append("url", url);

  const submitResponse = await fetch(`${BASE_URL}/urls`, {
    method: "POST",
    headers: {
      "x-apikey": API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!submitResponse.ok) {
    throw new Error(`VirusTotal API Error: ${submitResponse.status} ${submitResponse.statusText}`);
  }

  // Get the URL ID from the response
  const submitData = (await submitResponse.json()) as SubmitUrlData;
  const analysisId = submitData.data.id;

  // Convert the analysis ID to a base64 encoded URL
  const urlId = analysisId.split("-")[1];

  // Get the analysis report
  const response = await fetch(`${BASE_URL}/urls/${urlId}`, {
    method: "GET",
    headers: {
      "x-apikey": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`VirusTotal API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<UrlReport>;
}

export async function getAnalysisStatus(analysisId: string): Promise<AnalysisResponse> {
  const analysisResponse = await fetch(`${BASE_URL}/analyses/${analysisId}`, {
    method: "GET",
    headers: {
      "x-apikey": API_KEY,
    },
  });

  if (!analysisResponse.ok) {
    throw new Error(`Failed to get analysis status: ${analysisResponse.status} ${analysisResponse.statusText}`);
  }

  return analysisResponse.json() as Promise<AnalysisResponse>;
}

export async function calculateSha256(fileBuffer: Buffer): Promise<string> {
  const hash = crypto.createHash("sha256");
  hash.update(fileBuffer);
  return hash.digest("hex");
}
