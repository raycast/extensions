import { useEffect, useState } from 'react';
import fp from 'find-free-port';
import http from 'http';
import fetch from 'node-fetch';

/**
 * This simple http server is used to serve the Font Awesome icons to the
 * Raycast extension.
 *
 * We set this server up because:
 *
 * 1. The user might be in dark mode
 * 2. In dark mode, the icons should be white
 * 3. Font Awesome only serves them in black
 *
 * So this server proxies the requests to Font Awesome and if requested by the
 * client, sets the SVGs fill color to white.
 */
export default function useServer() {
  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    fp(10000).then(([port]: number[]) => {
      const server = http.createServer(async (req, res) => {
        const isDark = new URLSearchParams(req.url?.split('?')[1]).get('dark') === 'true';

        const svg = await fetch(`https://site-assets.fontawesome.com/releases/v6.2.0/svgs${req.url}`).then((res) =>
          res.text()
        );

        res.writeHead(200);

        if (isDark) {
          res.end(svg.replace(/<path/, "<path fill='#ffffff'"));
          return;
        }

        res.end(svg);
      });

      server.listen(port);

      setPort(port);
    });
  }, []);

  return port;
}
