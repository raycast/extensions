#!/usr/bin/env python3

import json
import os
import shutil
import sys
import subprocess
import tempfile
from urllib.parse import urlencode, quote
import socket
import argparse
import time
from argparse import RawDescriptionHelpFormatter

EXTENSION = "8w8kkr8typ/dmenu"
COMMAND = "dmenu"

ACCEPT_TIMEOUT = 10      # seconds to wait for Raycast to connect
RECV_TIMEOUT = 20        # seconds to wait for selection
TOTAL_TIMEOUT = (ACCEPT_TIMEOUT * 2) + RECV_TIMEOUT # max runtime

start_time = time.monotonic()

parser = argparse.ArgumentParser(
    prog="raycast_dmenu",
    description="dmenu-like raycast extension",
    formatter_class=RawDescriptionHelpFormatter,
)

parser.add_argument("-p", "--prompt", help="search bar placeholder text")
parser.add_argument("-d", "--debug", action="store_true", help="print debug logs to stderr")
args, _ = parser.parse_known_args()

DEBUG = args.debug

def log(msg):
    if not DEBUG:
        return
    print(f"[PY {time.monotonic() - start_time:.3f}] {msg}", file=sys.stderr, flush=True)


def timed_out():
    return time.monotonic() - start_time > TOTAL_TIMEOUT


# Guard: no stdin -> nothing to show
if sys.stdin.isatty():
    sys.exit(1)

elements = [line.rstrip("\n") for line in sys.stdin]
if not elements:
    sys.exit(1)


# Socket setup (Unix domain socket, owner-only access)
# ----------------------------------------------------
# tempfile.mkdtemp() creates its directory with mode 0700 — only this user
# can even traverse into it. That directory permission, not the socket
# file's own mode bits, is what actually keeps other local processes out,
# since they can't open a path they can't reach. The os.chmod below on the
# socket file itself is just defense in depth.
run_dir = tempfile.mkdtemp(prefix="raycast-dmenu-")
sock_path = os.path.join(run_dir, "dmenu.sock")

server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
server.settimeout(ACCEPT_TIMEOUT)
server.bind(sock_path)
os.chmod(sock_path, 0o600)
server.listen(2)

log(f"listening on {sock_path}")

arguments = {"socket": sock_path}
if args.prompt:
    arguments["prompt"] = args.prompt

query = urlencode({"arguments": json.dumps(arguments)}, quote_via=quote)

log(f"launching raycast deeplink with args: {arguments}")
subprocess.run(
    ["open", f"raycast://extensions/{EXTENSION}/{COMMAND}?{query}"],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)
log("raycast deeplink launched, entering accept loop")


sent_elements = False
final_result = None

try:
    while not timed_out():
        try:
            log(f"calling accept() (sent_elements={sent_elements})")
            conn, addr = server.accept()
            log(f"accept() returned, peer={addr}")
            conn.settimeout(RECV_TIMEOUT)

            if not sent_elements:
                # Send items
                log(f"sending {len(elements)} elements")
                conn.sendall(f"{len(elements)}\n".encode())
                for el in elements:
                    conn.sendall((el + "\n").encode())
                log("finished sending elements")

                sent_elements = True
                conn.close()
                log("closed conn after sending elements; looping back to accept()")
                continue

            # Receive selection
            log("receiving selection data")
            data = b""
            while True:
                chunk = conn.recv(1024)
                log(f"recv() returned {len(chunk)} bytes: {chunk!r}")
                if not chunk:
                    break
                data += chunk

            final_result = data.decode("utf-8").strip()
            log(f"final_result = {final_result!r}")
            conn.close()
            break

        except socket.timeout:
            log("socket.timeout raised, breaking loop")
            break
        except Exception as e:
            log(f"exception raised: {e!r}, breaking loop")
            break

    log(f"exited loop, timed_out={timed_out()}")
finally:
    server.close()
    shutil.rmtree(run_dir, ignore_errors=True)
    log("server socket closed, run dir removed")

# Result
if final_result:
    log(f"exiting 0 with result: {final_result!r}")
    print(final_result)
    sys.exit(0)

log("exiting 1, no final_result")
sys.exit(1)
