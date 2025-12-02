import { createServer, IncomingMessage } from "http";
import { networkInterfaces, homedir } from "os";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

const defaultDownloadDir = path.join(homedir(), "Downloads");

function decodeAndSanitizeFilename(rawName: string | undefined): { displayName: string; safeName: string } {
  const fallback = "received_file";
  if (!rawName) {
    return { displayName: fallback, safeName: fallback };
  }

  let decoded = rawName;
  try {
    decoded = decodeURIComponent(rawName);
  } catch {
    // Ignore decode failures and fall back to raw header value
  }

  const stripped = decoded.replace(/[\0]/g, "").trim();
  const normalized = stripped.replace(/[\\/]+/g, "/");
  const base = path.posix.basename(normalized);
  const cleaned = base.replace(/[<>:"/\\|?*]/g, "_");
  const safeName = cleaned || fallback;
  return { displayName: safeName, safeName };
}

async function writeRequestToFile(req: IncomingMessage, destinationPath: string) {
  await new Promise<void>((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    const cleanup = () => {
      req.removeListener("error", onError);
      fileStream.removeListener("error", onError);
      fileStream.removeListener("finish", onFinish);
    };
    const onFinish = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    req.on("error", onError);
    fileStream.on("error", onError);
    fileStream.on("finish", onFinish);
    req.pipe(fileStream);
  });
}

async function fallbackRemove(filePath: string) {
  try {
    await fs.promises.rm(filePath, { force: true });
  } catch {
    // Ignore removal errors
  }
}

const uploadPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raycast Qrcp Upload</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      background: #1a1a1a;
      color: #ffffff;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .container {
      background: #2a2a2a;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      padding: 32px 28px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      border: 1px solid #3a3a3a;
    }
    .container.drag-over {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 8px 32px rgba(0,0,0,0.4);
    }
    h2 {
      color: #ffffff;
      margin-bottom: 12px;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.2;
    }
    p {
      color: #a0a0a0;
      margin-bottom: 28px;
      font-size: 16px;
      line-height: 1.5;
    }
    input[type="file"] {
      margin-bottom: 20px;
      width: 100%;
      padding: 16px;
      background: #3a3a3a;
      border: 2px dashed #4a4a4a;
      border-radius: 12px;
      color: #ffffff;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }
    input[type="file"]:hover {
      background: #404040;
      border-color: #6366f1;
    }
    input[type="file"]:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    input[type="file"]::-webkit-file-upload-button {
      background: #6366f1;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      margin-right: 12px;
      transition: all 0.2s ease;
      position: relative;
      z-index: 1;
    }
    input[type="file"]::-webkit-file-upload-button:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }
    button {
      background: #6366f1;
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      margin-top: 8px;
      position: relative;
      overflow: hidden;
    }
    button:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
    }
    button:active {
      transform: translateY(0);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .success {
      color: #10b981;
      margin-top: 16px;
      font-weight: 500;
      font-size: 15px;
    }
    .error {
      color: #ef4444;
      margin-top: 16px;
      font-weight: 500;
      font-size: 15px;
    }
    .file-list {
      margin-top: 16px;
      text-align: left;
    }
    .file-item {
      background: #3a3a3a;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      border: 1px solid #4a4a4a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .file-item:before {
      content: "✓";
      color: #10b981;
      font-weight: bold;
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      body {
        padding: 16px;
      }
      .container {
        padding: 24px 20px;
        border-radius: 12px;
      }
      h2 {
        font-size: 24px;
      }
      p {
        font-size: 15px;
        margin-bottom: 24px;
      }
      input[type="file"] {
        padding: 20px 16px;
        font-size: 16px; /* Prevents zoom on iOS */
      }
      input[type="file"]::-webkit-file-upload-button {
        padding: 12px 16px;
        font-size: 12px;
      }
      button {
        padding: 18px 24px;
        font-size: 16px;
      }
      .file-item {
        padding: 14px 16px;
        font-size: 15px;
      }
    }

    /* Loading animation */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .loading {
      animation: pulse 1.5s ease-in-out infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>📁 Upload Files</h2>
    <p>Select files from your device to transfer them to your computer over Wi-Fi.</p>
    <form id="uploadForm">
  <input type="file" id="fileInput" name="files" multiple required />
  <div id="selectedFiles" style="margin-top: 8px; margin-bottom: 8px; text-align: left; color: #a0a0a0; font-size: 15px;"></div>
  <button type="submit">Upload Files</button>
    </form>
    <div id="fileList" class="file-list" style="display: none;">
      <h3 style="color: #a0a0a0; font-size: 14px; margin-bottom: 12px;">Uploaded Files:</h3>
      <div id="uploadedFiles"></div>
    </div>
    <div id="message"></div>
  </div>

  <script>
  (() => {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const message = document.getElementById('message');
    const fileList = document.getElementById('fileList');
    const uploadedFiles = document.getElementById('uploadedFiles');
    const submitButton = form.querySelector('button');
    let uploadedCount = 0;

    // Add drag and drop functionality
    const container = document.querySelector('.container');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      container.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
      container.classList.add('drag-over');
    }

    function unhighlight(e) {
      container.classList.remove('drag-over');
    }

    container.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      fileInput.files = files;
      // Trigger change event
      const event = new Event('change');
      fileInput.dispatchEvent(event);
    }

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      message.textContent = '';
      const files = fileInput.files;
      if (!files.length) {
        message.textContent = 'Please select at least one file.';
        message.className = 'error';
        return;
      }

      // Disable form during upload
      submitButton.disabled = true;
      submitButton.textContent = 'Uploading...';
      submitButton.classList.add('loading');

      message.textContent = 'Starting upload...';
      message.className = '';

      uploadedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          message.textContent = 'Uploading ' + file.name + '...';
          // Real upload to server
          const res = await fetch('/', {
            method: 'POST',
            headers: {
              'x-filename': encodeURIComponent(file.name)
            },
            body: file
          });
          if (res.ok) {
            uploadedCount++;
            message.textContent = 'Successfully uploaded ' + uploadedCount + ' of ' + files.length + ' files';
            message.className = 'success';
            // Add to uploaded files list
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.textContent = file.name;
            uploadedFiles.appendChild(fileItem);
            fileList.style.display = 'block';
          } else {
            message.textContent = 'Failed to upload: ' + file.name;
            message.className = 'error';
          }
        } catch (err) {
          message.textContent = 'Error uploading: ' + file.name;
          message.className = 'error';
        }
      }

      // Re-enable form
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
      submitButton.textContent = 'Upload Files';

      if (uploadedCount === files.length) {
        message.textContent = 'All ' + uploadedCount + ' files uploaded successfully!';
        fileInput.value = '';
      }
    });

    // File input change handler
    const selectedFilesDiv = document.getElementById('selectedFiles');
    fileInput.addEventListener('change', function(e) {
      const files = e.target.files;
      if (files.length > 0) {
        // Show file names below the input
        selectedFilesDiv.innerHTML = Array.from(files).map(f => '<div>' + f.name + '</div>').join('');
        message.textContent = '';
      } else {
        selectedFilesDiv.innerHTML = '';
      }
    });
  })();
  </script>
</body>
</html>`;

export async function generateQRCode(url: string): Promise<string> {
  return await QRCode.toDataURL(url);
}

export function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

type ReceiveServerOptions = {
  downloadDir?: string;
};

export async function startReceiveServer(options: ReceiveServerOptions = {}) {
  const ip = getLocalIp();
  const port = 0;
  let fileReceivedCallback: (fileName: string) => void = () => {};
  let deviceConnectedCallback: (ip: string) => void = () => {};
  const downloadDir = options.downloadDir ?? defaultDownloadDir;
  const server = createServer((req, res) => {
    if (req.method === "POST") {
      const { displayName, safeName } = decodeAndSanitizeFilename(req.headers["x-filename"] as string | undefined);
      const timestamp = Date.now();
      const fileName = `${timestamp}_${safeName}`;
      const filePath = path.join(downloadDir, fileName);
      (async () => {
        try {
          await fs.promises.mkdir(downloadDir, { recursive: true });
          await writeRequestToFile(req, filePath);
          fileReceivedCallback(displayName);
          res.writeHead(200);
          res.end("File received");
        } catch (error) {
          console.error("Failed to write uploaded file", error);
          await fallbackRemove(filePath);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end("Error saving file");
          } else {
            res.end();
          }
        }
      })();
    } else if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(uploadPageHtml);
      deviceConnectedCallback(req.socket?.remoteAddress || "unknown");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  // End of server handler
  await new Promise<void>((resolve) => server.listen(port, "0.0.0.0", resolve));
  const address = server.address();
  const url = address && typeof address === "object" ? `http://${ip}:${address.port}/` : "";
  return {
    url,
    onFileReceived: (cb: (fileName: string) => void) => {
      fileReceivedCallback = cb;
    },
    onDeviceConnected: (cb: (ip: string) => void) => {
      deviceConnectedCallback = cb;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
  };
}

export async function startSendServer(files: string[]) {
  const ip = getLocalIp();
  const port = 0;
  let downloadCallback: () => void = () => {};
  const downloadPageHtml = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raycast Qrcp Download</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        height: 100vh;
        overflow: hidden;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        background: #1a1a1a;
        color: #ffffff;
        margin: 0;
        padding: 20px;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .container {
        background: #2a2a2a;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        padding: 32px 28px;
        max-width: 420px;
        width: 100%;
        text-align: center;
        border: 1px solid #3a3a3a;
      }
      h2 {
        color: #ffffff;
        margin-bottom: 12px;
        font-size: 28px;
        font-weight: 600;
        line-height: 1.2;
      }
      p {
        color: #a0a0a0;
        margin-bottom: 28px;
        font-size: 16px;
        line-height: 1.5;
      }
      .file-list {
        margin-top: 16px;
        text-align: left;
        max-height: 50vh;
        overflow-y: auto;
      }
      .file-link {
        display: block;
        background: #3a3a3a;
        color: #fff;
        text-decoration: none;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 15px;
        border: 1px solid #4a4a4a;
        transition: background 0.2s;
      }
      .file-link:hover {
        background: #6366f1;
      }
      @media (max-width: 480px) {
        body {
          padding: 16px;
        }
        .container {
          padding: 24px 20px;
          border-radius: 12px;
        }
        h2 {
          font-size: 24px;
        }
        p {
          font-size: 15px;
          margin-bottom: 24px;
        }
        .file-link {
          padding: 14px 16px;
          font-size: 15px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>📥 Download Files</h2>
      <p>Tap a file to download it to your device.</p>
      <div id="fileList" class="file-list">
        ${files
          .map((file, i) => {
            const name = path.basename(file);
            return `<a class='file-link' href='/file/${i}' download='${name}'>${name}</a>`;
          })
          .join("")}
      </div>
    </div>
  </body>
  </html>`;

  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(downloadPageHtml);
    } else if (req.method === "GET" && req.url?.startsWith("/file/")) {
      const idx = parseInt(req.url.split("/file/")[1], 10);
      if (!isNaN(idx) && files[idx]) {
        const filePath = files[idx];
        const fileName = path.basename(filePath);
        fs.promises
          .stat(filePath)
          .then(() => {
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            const readStream = fs.createReadStream(filePath);
            readStream.on("error", () => {
              if (!res.headersSent) {
                res.writeHead(500);
                res.end("Error reading file");
              } else {
                res.end();
              }
            });
            readStream.pipe(res);
            res.on("finish", () => {
              downloadCallback();
            });
          })
          .catch(() => {
            res.writeHead(404);
            res.end();
          });
      } else {
        res.writeHead(404);
        res.end();
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(port, "0.0.0.0", resolve));
  const address = server.address();
  const url = address && typeof address === "object" ? `http://${ip}:${address.port}/` : "";
  return {
    url,
    onDownload: (cb: () => void) => {
      downloadCallback = cb;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }),
  };
}
