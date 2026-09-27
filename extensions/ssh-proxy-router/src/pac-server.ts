// Keep this source embedded so Raycast bundles it with the extension.
export const PAC_SERVER_SOURCE = `
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import sys

class PACHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_HEAD(self):
        self.serve_pac(False)

    def do_GET(self):
        self.serve_pac(True)

    def serve_pac(self, body):
        if urlsplit(self.path).path != "/proxy.pac":
            self.send_error(404)
            return
        try:
            with open(sys.argv[2], "rb") as pac:
                content = pac.read()
        except OSError:
            self.send_error(503)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ns-proxy-autoconfig")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Router-Instance", sys.argv[3])
        self.end_headers()
        if body:
            self.wfile.write(content)

server = ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), PACHandler)
server.serve_forever()
`;
