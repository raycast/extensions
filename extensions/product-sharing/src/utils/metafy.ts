import fetch from "node-fetch";

export const getServerMetafy = async (targetUrl: string) => {
  try {
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(targetUrl)}`);
    const data = await res.json();
    return data as ApiResponse;
  } catch (error) {
    throw new Error(`Failed to get Microlink: ${(error as Error).message}`);
  }
};

interface Image {
  url: string;
  type: string;
  size: number;
  height: number;
  width: number;
  size_pretty: string;
}

type Screenshot = Image;

interface Logo {
  url: string;
  type: string;
  size: number;
  height: number;
  width: number;
  size_pretty: string;
}

interface Data {
  lang: string;
  author: string;
  title: string;
  publisher: string;
  image?: Image | null;
  screenshot?: Screenshot | null;
  url: string;
  description: string;
  date: string;
  logo: Logo;
}

interface Headers {
  "access-control-allow-credentials": string;
  "alt-svc": string;
  "cf-cache-status": string;
  "cf-ray": string;
  "content-encoding": string;
  "content-type": string;
  date: string;
  nel: string;
  "report-to": string;
  "reporting-endpoints": string;
  server: string;
  "set-cookie": string;
  "strict-transport-security": string;
  vary: string;
  via: string;
  "x-content-type-options": string;
  "x-dns-prefetch-control": string;
  "x-download-options": string;
  "x-frame-options": string;
  "x-xss-protection": string;
}

interface ApiResponse {
  status: string;
  data: Data;
  statusCode: number;
  headers: Headers;
}
