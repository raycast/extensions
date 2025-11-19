import { Clipboard, showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Getting image from clipboard...",
  });

  try {
    let imagePath: string | undefined;
    let isTempFile = false;
    const clipboardContent = await Clipboard.read();

    if (clipboardContent.file) {
      const decodedPath = decodeURIComponent(clipboardContent.file.replace(/^file:\/\//, ""));
      if (fs.existsSync(decodedPath)) {
        imagePath = decodedPath;
      }
    }

    if (!imagePath) {
      const tempFile = path.join(os.tmpdir(), `annotely-clipboard-${Date.now()}.png`);

      try {
        await runAppleScript(`
          set theFile to (POSIX file "${tempFile}")
          try
            set theData to the clipboard as «class PNGf»
            set theRef to open for access theFile with write permission
            set eof of theRef to 0
            write theData to theRef
            close access theRef
          on error
            try
              close access theFile
            end try
            error "No image data found"
          end try
        `);

        if (fs.existsSync(tempFile)) {
          imagePath = tempFile;
          isTempFile = true;
        }
      } catch {
        // Ignore AppleScript errors (likely no image in clipboard)
      }
    }

    if (!imagePath) {
      toast.style = Toast.Style.Failure;
      toast.title = "No image found";
      toast.message = "Please copy an image or screenshot to clipboard first.";
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const server = http.createServer((req, res) => {
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
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": stat.size,
          });
          const readStream = fs.createReadStream(imagePath);
          readStream.pipe(res);
        } catch {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });

      server.listen(0, "127.0.0.1", async () => {
        const address = server.address();
        if (typeof address === "object" && address) {
          const port = address.port;
          const fileName = path.basename(imagePath!);
          const localUrl = `http://127.0.0.1:${port}/${fileName}`;
          const annotelyUrl = `https://annotely.com/editor?url=${encodeURIComponent(localUrl)}`;

          await open(annotelyUrl);

          toast.style = Toast.Style.Success;
          toast.title = "Opened in Annotely";
        } else {
          server.close();
          if (isTempFile && imagePath && fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch {
              // Ignore cleanup errors
            }
          }
          reject(new Error("Failed to get server address"));
        }
      });

      server.on("error", (err) => {
        reject(err);
      });

      setTimeout(() => {
        server.close();
        if (isTempFile && imagePath && fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch {
            // Ignore cleanup errors
          }
        }
        resolve();
      }, 60000);
    });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Error";
    toast.message = String(error);
  }
}
