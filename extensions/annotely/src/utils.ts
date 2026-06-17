import { open, Toast } from "@raycast/api";
import http from "http";
import fs from "fs";
import path from "path";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "image/png";
  }
}

function cleanupFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function createServerHandler(imagePath: string) {
  return (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    try {
      const stat = fs.statSync(imagePath);
      const contentType = getMimeType(imagePath);

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stat.size,
      });
      const readStream = fs.createReadStream(imagePath);
      readStream.pipe(res);
    } catch {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };
}

export async function serveImageAndOpenAnnotely(imagePath: string, isTempFile: boolean, toast: Toast) {
  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(createServerHandler(imagePath));

    server.listen(0, "127.0.0.1", async () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        const fileName = path.basename(imagePath);
        const localUrl = `http://127.0.0.1:${port}/${fileName}`;
        const annotelyUrl = `https://annotely.com/editor?url=${encodeURIComponent(localUrl)}`;

        await open(annotelyUrl);

        toast.style = Toast.Style.Success;
        toast.title = "Opened in Annotely";
      } else {
        server.close();
        if (isTempFile) cleanupFile(imagePath);
        reject(new Error("Failed to get server address"));
      }
    });

    server.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => {
      server.close();
      if (isTempFile) cleanupFile(imagePath);
      resolve();
    }, 60000);
  });
}
