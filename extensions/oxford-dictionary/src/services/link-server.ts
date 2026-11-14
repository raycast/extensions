import http from 'http';
import { exec } from 'child_process';
import { speakWord } from './pronunciation-service';

const DEFAULT_PORT = 48921;
let serverPort = DEFAULT_PORT;
let serverInstance: http.Server | null = null;
let isStarted = false;

/**
 * Initializes a local HTTP bridge server for Raycast Markdown links.
 * Raycast's desktop frontend sanitizes out `raycast://` URIs, but preserves `http://` URIs.
 * By serving a local HTTP bridge that immediately fires the Raycast deeplink and closes the tab,
 * every markdown link in Detail views becomes 100% clickable with the mouse.
 */
export function initLinkServer(): number {
  if (isStarted && serverInstance) {
    return serverPort;
  }

  isStarted = true;

  try {
    serverInstance = http.createServer((req, res) => {
      try {
        const urlObj = new URL(req.url || '/', `http://127.0.0.1:${serverPort}`);
        const pathname = urlObj.pathname;

        if (pathname === '/def') {
          const word = urlObj.searchParams.get('word') || '';
          if (word) {
            const encoded = encodeURIComponent(word.toLowerCase());
            const args = encodeURIComponent(JSON.stringify({ word: word.toLowerCase() }));
            const deeplink = `raycast://extensions/johnathan_w/oxford-dictionary/def?fallbackText=${encoded}&arguments=${args}`;
            exec(`start "" "${deeplink}"`, (err) => {
              if (err) console.error('[link-server] Error executing def deeplink:', err);
            });
          }
        } else if (pathname === '/roget') {
          const query = urlObj.searchParams.get('query') || '';
          if (query) {
            const encoded = encodeURIComponent(query);
            const args = encodeURIComponent(JSON.stringify({ query }));
            const deeplink = `raycast://extensions/johnathan_w/oxford-dictionary/roget?fallbackText=${encoded}&arguments=${args}`;
            exec(`start "" "${deeplink}"`, (err) => {
              if (err) console.error('[link-server] Error executing roget deeplink:', err);
            });
          }
        } else if (pathname === '/speak') {
          const word = urlObj.searchParams.get('word') || '';
          if (word) {
            speakWord(word).catch((err) => console.error('[link-server] Error speaking word:', err));
          }
        }

        // Return a clean self-closing HTML response
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Opening in Raycast...</title>
  <script>
    window.close();
    setTimeout(function() { window.close(); }, 150);
  </script>
</head>
<body style="background:#141414;color:#efefef;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p style="font-size:14px;">Opening definition in Raycast...</p>
  <script>
    window.close();
    setTimeout(function() { window.close(); }, 200);
  </script>
</body>
</html>`);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    serverInstance.listen(DEFAULT_PORT, '127.0.0.1', () => {
      const addr = serverInstance?.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
      }
      serverInstance?.unref();
    });

    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port taken by another process or previous instance; listen on random free port
        serverInstance?.listen(0, '127.0.0.1', () => {
          const addr = serverInstance?.address();
          if (addr && typeof addr === 'object') {
            serverPort = addr.port;
          }
          serverInstance?.unref();
        });
      }
    });
  } catch (err) {
    console.error('[link-server] Failed to start link bridge server:', err);
  }

  return serverPort;
}

// Auto-start on module import
initLinkServer();

export function getLinkServerPort(): number {
  return serverPort;
}

export function getDefLink(word: string): string {
  const encoded = encodeURIComponent(word.toLowerCase().trim());
  return `raycast://extensions/johnathan_w/oxford-dictionary/def?fallbackText=${encoded}`;
}

export function getRogetLink(query: string | number): string {
  const encoded = encodeURIComponent(String(query).trim());
  return `raycast://extensions/johnathan_w/oxford-dictionary/roget?fallbackText=${encoded}`;
}

export function getSpeakLink(word: string): string {
  const args = encodeURIComponent(JSON.stringify({ word: word.toLowerCase().trim() }));
  return `raycast://extensions/johnathan_w/oxford-dictionary/pronounce?arguments=${args}`;
}
