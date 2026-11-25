#!/usr/bin/env python3
"""Attach the current terminal to a live Termini session (like `tmux attach`).

usage: termini-attach.py SOCKET TAB_ID

Keystrokes go to the session's PTY, its output comes back raw, and window resizes are
forwarded. Closing the window only detaches: the session keeps running in the Termini
daemon and can be reopened in Raycast or attached again.
"""

from __future__ import annotations

import fcntl
import json
import os
import select
import signal
import socket
import struct
import sys
import termios
import tty


def frame(kind: bytes, payload: bytes) -> bytes:
    return kind + len(payload).to_bytes(4, "big") + payload


def window_size() -> tuple[int, int]:
    try:
        rows, columns, _, _ = struct.unpack("HHHH", fcntl.ioctl(sys.stdout.fileno(), termios.TIOCGWINSZ, b"\0" * 8))
        if rows and columns:
            return rows, columns
    except OSError:
        pass
    return 24, 80


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: termini-attach.py SOCKET TAB_ID", file=sys.stderr)
        return 2
    socket_path, tab_id = sys.argv[1], sys.argv[2]

    connection = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        connection.connect(socket_path)
    except OSError as error:
        print(f"termini: daemon not reachable ({error}). Open Termini in Raycast first.", file=sys.stderr)
        return 1

    rows, columns = window_size()
    header = json.dumps({"tabId": tab_id, "rows": rows, "columns": columns})
    connection.sendall(b"ATTACH " + header.encode("utf-8") + b"\n")

    # select() auto-retries after signals (PEP 475), so SIGWINCH writes to a pipe to wake it.
    wake_read, wake_write = os.pipe()
    os.set_blocking(wake_write, False)
    signal.set_wakeup_fd(wake_write)
    signal.signal(signal.SIGWINCH, lambda *_: None)

    stdin = sys.stdin.fileno()
    stdout = sys.stdout.fileno()
    saved = termios.tcgetattr(stdin)
    tty.setraw(stdin)
    try:
        while True:
            readable, _, _ = select.select([stdin, connection, wake_read], [], [])
            if wake_read in readable:
                os.read(wake_read, 512)
                connection.sendall(frame(b"R", json.dumps(window_size()).encode("utf-8")))
            if connection in readable:
                data = connection.recv(65536)
                if not data:
                    break
                os.write(stdout, data)
            if stdin in readable:
                data = os.read(stdin, 65536)
                if not data:
                    break
                connection.sendall(frame(b"D", data))
    except OSError:
        pass
    finally:
        termios.tcsetattr(stdin, termios.TCSADRAIN, saved)
        # Leave any alt screen / hidden cursor the session may have left on.
        os.write(stdout, b"\x1b[0m\x1b[?25h\x1b[?1049l\r\n[termini: detached, session still running]\r\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
