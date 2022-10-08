import { useEffect, useState } from 'react';
import fp from 'find-free-port';
import http from 'http';
import fetch from 'node-fetch';

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
