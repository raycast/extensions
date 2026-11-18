#!/usr/bin/env python3
"""RayTerm macOS daemon.

Owns persistent POSIX PTY sessions and exposes a small JSON protocol over a
Unix domain socket. The Raycast extension is only a client.
"""

from __future__ import annotations

import codecs
import errno
import fcntl
import json
import os
import pty
import re
import select
import signal
import socket
import struct
import subprocess
import sys
import termios
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable

CSI_FINAL = re.compile(r"[@-~]")
DAEMON_VERSION = "raytermd-v2"
# Only the last N styled rows are serialized into each snapshot. The Raycast
# detail view renders ~23-41 rows and page-scrolls, so this is generous
# scrollback while keeping the per-frame payload small enough to stream large
# outputs (e.g. `tree`) without saturating the client. Full plain text is still
# sent separately for copy.
MAX_RENDER_LINES = 500
PTY_SELECT_TIMEOUT = 0.04
SYNC_UPDATE_MAX_LATENCY = 0.05
TITLE_POLL_INTERVAL = 0.25
DEFAULT_FG = "#d6deeb"
DEFAULT_BG = "#111827"
ANSI_COLORS = ["#1f2937", "#ef4444", "#22c55e", "#eab308", "#3b82f6", "#d946ef", "#06b6d4", "#e5e7eb"]
ANSI_BRIGHT_COLORS = ["#6b7280", "#f87171", "#4ade80", "#facc15", "#60a5fa", "#e879f9", "#22d3ee", "#ffffff"]
DEFAULT_ANSI = ANSI_COLORS + ANSI_BRIGHT_COLORS


def xterm_256_color(index: int, ansi: list[str] | None = None) -> str:
    if index < 16:
        return (ansi or DEFAULT_ANSI)[max(0, min(15, index))]
    if 16 <= index <= 231:
        value = index - 16
        red = value // 36
        green = (value % 36) // 6
        blue = value % 6
        steps = [0, 95, 135, 175, 215, 255]
        return f"#{steps[red]:02x}{steps[green]:02x}{steps[blue]:02x}"
    gray = 8 + (max(232, min(255, index)) - 232) * 10
    return f"#{gray:02x}{gray:02x}{gray:02x}"


@dataclass(frozen=True)
class DaemonConfig:
    shell_path: str
    shell_args: list[str]
    working_directory: str
    visible_terminal_lines: int
    terminal_columns: int
    max_transcript_lines: int

    @staticmethod
    def load(path: str) -> "DaemonConfig":
        with open(path, "r", encoding="utf-8") as file:
            raw = json.load(file)

        return DaemonConfig(
            shell_path=raw.get("shellPath") or "/bin/zsh",
            shell_args=list(raw.get("shellArgs") or ["-il"]),
            working_directory=raw.get("workingDirectory") or os.path.expanduser("~"),
            visible_terminal_lines=int(raw.get("visibleTerminalLines") or 19),
            terminal_columns=int(raw.get("terminalColumns") or 60),
            max_transcript_lines=int(raw.get("maxTranscriptLines") or 4000),
        )


class TerminalSession:
    def __init__(self, config: DaemonConfig, title: str, tab_id: str | None = None, index: int = 0, on_change: Callable[[], None] | None = None):
        self.config = config
        self.id = tab_id or str(uuid.uuid4())
        self.index = index
        self.default_title = title
        self.terminal_title: str | None = None
        self.job_title: str | None = None
        self.submitted_title: str | None = None
        self.title = title
        self.on_change = on_change
        self.command_count = 0
        self.pid: int | None = None
        self.fd: int | None = None
        self.rows = config.visible_terminal_lines
        self.columns = config.terminal_columns
        self.theme_fg = DEFAULT_FG
        self.theme_bg = DEFAULT_BG
        self.theme_ansi = list(DEFAULT_ANSI)
        self.lock = threading.RLock()
        self.lines = [""]
        self.cell_lines: list[list[dict[str, Any]]] = [[]]
        self.scrollback_lines: list[str] = []
        self.scrollback_cell_lines: list[list[dict[str, Any]]] = []
        self.published_lines = [""]
        self.published_cell_lines: list[list[dict[str, Any]]] = [[]]
        self.published_scrollback_lines: list[str] = []
        self.published_scrollback_cell_lines: list[list[dict[str, Any]]] = []
        self.published_cursor_row = 0
        self.published_cursor_col = 0
        self.sync_update = False
        self.sync_dirty = False
        self.last_sync_publish_at = 0.0
        self.cursor_row = 0
        self.cursor_col = 0
        self.scroll_top = 0
        self.scroll_bottom = max(0, self.rows - 1)
        self.saved_cursor: tuple[int, int] | None = None
        self.normal_state: tuple[list[str], list[list[dict[str, Any]]], int, int] | None = None
        self.alt_screen = False
        self.fg: str | None = None
        self.bg: str | None = None
        self.bold = False
        self.dim = False
        self.italic = False
        self.inverse = False
        self.pending_echo: str | None = None
        self.closed = False
        self.last_output_at = time.time()
        self.decoder = codecs.getincrementaldecoder("utf-8")("replace")
        self.pending_escape = ""
        self.start()

    def start(self) -> None:
        pid, fd = pty.fork()
        if pid == 0:
            self._exec_child()

        self.pid = pid
        self.fd = fd
        self._resize()
        self._disable_echo()
        threading.Thread(target=self._read_loop, daemon=True).start()
        threading.Thread(target=self._title_loop, daemon=True).start()

    def _exec_child(self) -> None:
        self._disable_child_echo()
        try:
            os.chdir(self.config.working_directory)
        except Exception:
            pass

        env = dict(os.environ)
        env.update(
            {
                "TERM": "xterm-256color",
                "COLORTERM": "truecolor",
                "COLUMNS": str(self.columns),
                "LINES": str(self.rows),
                "LANG": env.get("LANG") or "C.UTF-8",
                "LC_ALL": env.get("LC_ALL") or "C.UTF-8",
                "RAYTERM": "1",
            }
        )
        os.execvpe(self.config.shell_path, [self.config.shell_path, *self.config.shell_args], env)

    def resize(self, rows: int, columns: int) -> None:
        with self.lock:
            self.rows = max(1, rows)
            self.columns = max(1, columns)
            self._reset_scroll_region()
            if self.alt_screen:
                self._fit_alt_screen_to_size()
                self.cursor_row = min(self.cursor_row, max(0, self.rows - 1))
            self.cursor_col = min(self.cursor_col, max(0, self.columns - 1))
            self._resize()
            if self.pid is not None:
                try:
                    os.kill(self.pid, signal.SIGWINCH)
                except Exception:
                    pass
            self._publish()

    def set_theme(self, theme: dict[str, Any]) -> None:
        with self.lock:
            foreground = theme.get("foreground")
            background = theme.get("background")
            ansi = theme.get("ansi")
            if isinstance(foreground, str) and foreground:
                self.theme_fg = foreground
            if isinstance(background, str) and background:
                self.theme_bg = background
            if isinstance(ansi, list) and len(ansi) >= 16 and all(isinstance(color, str) and color for color in ansi[:16]):
                self.theme_ansi = list(ansi[:16])
            if self.pid is not None:
                try:
                    os.kill(self.pid, signal.SIGWINCH)
                except Exception:
                    pass

    def _resize(self) -> None:
        if self.fd is None:
            return
        try:
            fcntl.ioctl(
                self.fd,
                termios.TIOCSWINSZ,
                struct.pack("HHHH", self.rows, self.columns, 0, 0),
            )
        except Exception:
            pass

    def _disable_echo(self) -> None:
        if self.fd is None:
            return
        try:
            attrs = termios.tcgetattr(self.fd)
            attrs[3] = attrs[3] & ~termios.ECHO
            termios.tcsetattr(self.fd, termios.TCSANOW, attrs)
        except Exception:
            pass

    def _disable_child_echo(self) -> None:
        try:
            attrs = termios.tcgetattr(0)
            attrs[3] = attrs[3] & ~termios.ECHO
            termios.tcsetattr(0, termios.TCSANOW, attrs)
        except Exception:
            pass

    def _read_loop(self) -> None:
        while not self.closed and self.fd is not None:
            try:
                readable, _, _ = select.select([self.fd], [], [], PTY_SELECT_TIMEOUT)
                if not readable:
                    should_notify = False
                    with self.lock:
                        if self.sync_update and self.sync_dirty and time.monotonic() - self.last_sync_publish_at >= SYNC_UPDATE_MAX_LATENCY:
                            self._publish()
                            should_notify = True
                    if should_notify and self.on_change:
                        self.on_change()
                    continue
                data = os.read(self.fd, 8192)
                if not data:
                    break
                with self.lock:
                    self.apply_output(self.decoder.decode(data))
                    if self.sync_update:
                        self.sync_dirty = True
                        if time.monotonic() - self.last_sync_publish_at >= SYNC_UPDATE_MAX_LATENCY:
                            self._publish()
                            should_notify = True
                        else:
                            should_notify = False
                    else:
                        should_notify = True
                if should_notify and self.on_change:
                    self.on_change()
            except OSError as error:
                if error.errno == errno.EIO:
                    break
                time.sleep(0.1)
            except Exception:
                time.sleep(0.1)
        self.closed = True
        if self.on_change:
            self.on_change()

    def _title_loop(self) -> None:
        while not self.closed:
            try:
                # Resolve the foreground job with `ps` OUTSIDE the session lock so a
                # slow process listing never stalls snapshots or the PTY read loop.
                next_job_title = self._foreground_job_title()
                changed = False
                with self.lock:
                    if next_job_title != self.job_title:
                        self.job_title = next_job_title
                        changed = self._refresh_display_title()
                if changed and self.on_change:
                    self.on_change()
            except Exception:
                pass
            time.sleep(TITLE_POLL_INTERVAL)

    def send(self, value: str, filter_echo: bool = False) -> bool:
        if self.closed or self.fd is None:
            return False
        try:
            if filter_echo and value:
                self.pending_echo = value.replace("\r\n", "\n").replace("\r", "\n")
                submitted_title = self._command_title_from_input(value)
                if submitted_title:
                    with self.lock:
                        self.submitted_title = submitted_title
                        title_changed = self._refresh_display_title()
                    if title_changed and self.on_change:
                        self.on_change()
            os.write(self.fd, value.encode("utf-8"))
            return True
        except Exception:
            return False

    def kill(self) -> None:
        self.closed = True
        if self.pid is not None:
            try:
                os.kill(self.pid, signal.SIGTERM)
            except Exception:
                pass
        if self.fd is not None:
            try:
                os.close(self.fd)
            except Exception:
                pass

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            lines = self.published_lines if self.sync_update else self.lines
            cell_lines = self.published_cell_lines if self.sync_update else self.cell_lines
            scrollback_lines = self.published_scrollback_lines if self.sync_update else self.scrollback_lines
            scrollback_cell_lines = self.published_scrollback_cell_lines if self.sync_update else self.scrollback_cell_lines
            cursor_row = self.published_cursor_row if self.sync_update else self.cursor_row
            cursor_col = self.published_cursor_col if self.sync_update else self.cursor_col
            if self.alt_screen:
                lines = [*scrollback_lines, *lines]
                cell_lines = [*scrollback_cell_lines, *cell_lines]
                cursor_row += len(scrollback_lines)

            full_text = "\n".join(lines).strip("\n")
            render_cells = cell_lines
            render_cursor_row = cursor_row
            if len(cell_lines) > MAX_RENDER_LINES:
                trimmed = len(cell_lines) - MAX_RENDER_LINES
                render_cells = cell_lines[trimmed:]
                render_cursor_row = max(0, cursor_row - trimmed)

            return {
                "id": self.id,
                "title": self.title,
                "index": self.index,
                "commandCount": self.command_count,
                "text": full_text,
                "status": "running" if time.time() - self.last_output_at < 0.8 else "idle",
                "cursorRow": render_cursor_row,
                "cursorCol": cursor_col,
                "rows": self.rows,
                "columns": self.columns,
                "cells": render_cells,
                "truncated": len(cell_lines) > MAX_RENDER_LINES,
            }

    def apply_output(self, text: str) -> None:
        self.last_output_at = time.time()
        if self.pending_escape:
            text = self.pending_escape + text
            self.pending_escape = ""
        text = self._remove_pending_echo(text)
        index = 0
        while index < len(text):
            char = text[index]
            if char == "\x1b":
                next_index = self._handle_escape(text, index)
                if next_index is None:
                    if self._is_incomplete_escape(text, index):
                        self.pending_escape = text[index:]
                        break
                    index += 1
                else:
                    index = next_index
                continue
            if char == "\r":
                self.cursor_col = 0
            elif char == "\n":
                self._index()
                self.cursor_col = 0
            elif char in ("\b", "\x7f"):
                self.cursor_col = max(0, self.cursor_col - 1)
            elif char == "\f":
                self._clear_screen()
            elif char == "\t":
                for _ in range(4 - (self.cursor_col % 4)):
                    self._put_char(" ")
            elif char >= " ":
                self._put_char(char)
            index += 1
        self._trim()
        if not self.sync_update:
            self._publish()

    def _publish(self) -> None:
        self.published_lines = list(self.lines)
        self.published_cell_lines = [[dict(cell) for cell in row] for row in self.cell_lines]
        self.published_scrollback_lines = list(self.scrollback_lines)
        self.published_scrollback_cell_lines = [[dict(cell) for cell in row] for row in self.scrollback_cell_lines]
        self.published_cursor_row = self.cursor_row
        self.published_cursor_col = self.cursor_col
        self.sync_dirty = False
        self.last_sync_publish_at = time.monotonic()

    def _is_incomplete_escape(self, text: str, start: int) -> bool:
        if start + 1 >= len(text):
            return True
        second = text[start + 1]
        if second in ("[", "]", "P", "^", "_"):
            return True
        if second in ("(", ")", "*", "+", "-", ".", "/", "#"):
            return start + 2 >= len(text)
        return False

    def _remove_pending_echo(self, text: str) -> str:
        if not self.pending_echo:
            return text

        normalized_text = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized_echo = self.pending_echo.replace("\r\n", "\n").replace("\r", "\n")

        if normalized_text.startswith(normalized_echo):
            self.pending_echo = None
            return normalized_text[len(normalized_echo) :]

        if normalized_echo.startswith(normalized_text):
            self.pending_echo = normalized_echo[len(normalized_text) :]
            return ""

        self.pending_echo = None
        return text

    def _handle_escape(self, text: str, start: int) -> int | None:
        if start + 1 >= len(text):
            return None

        second = text[start + 1]
        if second in ("D", "E", "M", "c", "H", "=", ">"):
            if second == "D":
                self._index()
            elif second == "E":
                self._index()
                self.cursor_col = 0
            elif second == "M":
                self._reverse_index()
            elif second == "c":
                self.fg = None
                self.bg = None
                self.bold = False
                self.inverse = False
                self._reset_scroll_region()
                self._clear_screen()
            return start + 2

        if second in ("(", ")", "*", "+", "-", ".", "/", "#"):
            return start + 3 if start + 2 < len(text) else None

        if second in ("P", "^", "_"):
            return self._skip_st_or_bell(text, start + 2)

        if start + 1 < len(text) and text[start + 1] == "7":
            self.saved_cursor = (self.cursor_row, self.cursor_col)
            return start + 2
        if start + 1 < len(text) and text[start + 1] == "8":
            if self.saved_cursor:
                self.cursor_row, self.cursor_col = self.saved_cursor
            return start + 2

        osc_end = self._skip_osc(text, start)
        if osc_end is not None:
            return osc_end

        if text.startswith("\x1b[?u", start):
            self._reply("\x1b[?0u")
            return start + 4

        decrqm = re.match(r"\x1b\[\?(\d+)\$p", text[start:])
        if decrqm:
            self._reply(f"\x1b[?{decrqm.group(1)};2$y")
            return start + len(decrqm.group(0))

        parsed = self._parse_csi(text, start)
        if not parsed:
            return None

        command, amount, mode, params, next_index = parsed
        if command == "A":
            self.cursor_row = max(0, self.cursor_row - amount)
        elif command == "B":
            self.cursor_row = min(len(self.lines) - 1, self.cursor_row + amount)
        elif command == "C":
            self.cursor_col += amount
        elif command == "D":
            self.cursor_col = max(0, self.cursor_col - amount)
        elif command == "E":
            self.cursor_row = min(len(self.lines) - 1, self.cursor_row + amount)
            self.cursor_col = 0
        elif command == "F":
            self.cursor_row = max(0, self.cursor_row - amount)
            self.cursor_col = 0
        elif command == "G":
            self.cursor_col = max(0, amount - 1)
        elif command == "d":
            self.cursor_row = max(0, amount - 1)
            self._ensure_cursor()
        elif command in ("H", "f"):
            row = params[0] if len(params) >= 1 else 1
            column = params[1] if len(params) >= 2 else 1
            self.cursor_row = max(0, row - 1)
            self.cursor_col = max(0, column - 1)
            self._ensure_cursor()
        elif command == "K":
            self._erase_line(mode)
        elif command == "J":
            self._erase_display(mode)
        elif command == "X":
            self._erase_chars(amount)
        elif command == "@":
            self._insert_chars(amount)
        elif command == "P":
            self._delete_chars(amount)
        elif command == "L":
            self._insert_lines(amount)
        elif command == "M":
            self._delete_lines(amount)
        elif command == "S":
            self._scroll_up(amount)
        elif command == "T":
            self._scroll_down(amount)
        elif command == "r":
            self._set_scroll_region(params)
        elif command == "m":
            self._apply_sgr(params)
        elif command == "n":
            self._report_device_status(params)
        elif command == "c":
            self._reply("\x1b[?1;2c")
        elif command == "t":
            self._report_window_status(params)
        elif command == "h":
            if 2026 in params:
                self.sync_update = True
            if any(param in (47, 1047, 1049) for param in params):
                self._enter_alt_screen()
        elif command == "l":
            if any(param in (47, 1047, 1049) for param in params):
                self._exit_alt_screen()
            if 2026 in params:
                self.sync_update = False
                self._publish()
        elif command == "s":
            self.saved_cursor = (self.cursor_row, self.cursor_col)
        elif command == "u" and self.saved_cursor:
            self.cursor_row, self.cursor_col = self.saved_cursor
        return next_index

    def _parse_csi(self, text: str, start: int) -> tuple[str, int, int, list[int], int] | None:
        if start + 1 >= len(text) or text[start + 1] != "[":
            return None

        index = start + 2
        body = ""
        while index < len(text):
            char = text[index]
            if CSI_FINAL.match(char):
                if char == "m" and body.startswith(">"):
                    return "ignore", 1, 0, [], index + 1
                params = [int(part) for part in re.findall(r"\d+", body)]
                amount = params[0] if params else 1
                mode = params[0] if params else 0
                return char, amount, mode, params, index + 1
            body += char
            index += 1
        return None

    def _skip_osc(self, text: str, start: int) -> int | None:
        if start + 1 >= len(text) or text[start + 1] != "]":
            return None
        bell = text.find("\x07", start + 2)
        st = text.find("\x1b\\", start + 2)
        candidates = [candidate for candidate in (bell, st) if candidate != -1]
        if not candidates:
            return None
        end = min(candidates)
        self._handle_osc(text[start + 2 : end])
        return end + (2 if end == st else 1)

    def _handle_osc(self, body: str) -> None:
        title = re.match(r"([012]);(.*)", body, re.DOTALL)
        if title:
            self._set_title(title.group(2))
        elif body == "10;?":
            self._reply(f"\x1b]10;{self._osc_rgb(self.theme_fg)}\x1b\\")
        elif body == "11;?":
            self._reply(f"\x1b]11;{self._osc_rgb(self.theme_bg)}\x1b\\")
        elif re.match(r"1[0-9];\?", body):
            self._reply(f"\x1b]{body[:2]};{self._osc_rgb(self.theme_fg)}\x1b\\")
        else:
            palette = re.match(r"4;(\d+);\?", body)
            if palette:
                index = max(0, min(15, int(palette.group(1))))
                self._reply(f"\x1b]4;{index};{self._osc_rgb(self.theme_ansi[index])}\x1b\\")

    def _set_title(self, value: str) -> None:
        title = re.sub(r"[\x00-\x1f\x7f]+", " ", value).strip()
        if not title or title == self.terminal_title:
            return
        self.terminal_title = title[:120]
        self._refresh_display_title()

    def _refresh_display_title(self) -> bool:
        next_title = self.job_title or self.submitted_title or self.terminal_title or self.default_title
        if next_title == self.title:
            return False
        self.title = next_title
        return True

    def _foreground_job_title(self) -> str | None:
        pgid = self._foreground_pgid()
        if pgid is not None and pgid > 0 and pgid != self.pid:
            command = self._process_group_command(pgid)
            if command:
                return command[:120]
        return self._descendant_job_title()

    def _foreground_pgid(self) -> int | None:
        if self.fd is None:
            return None
        try:
            return os.tcgetpgrp(self.fd)
        except Exception:
            pass
        try:
            raw = fcntl.ioctl(self.fd, termios.TIOCGPGRP, struct.pack("i", 0))
            return struct.unpack("i", raw)[0]
        except Exception:
            return None

    def _process_group_command(self, pgid: int) -> str | None:
        try:
            result = subprocess.run(
                ["/bin/ps", "-axo", "pid=,pgid=,stat=,comm=,command="],
                capture_output=True,
                text=True,
                timeout=0.2,
            )
        except Exception:
            return None
        if result.returncode != 0:
            return None

        candidates: list[tuple[int, str, str]] = []
        for line in result.stdout.splitlines():
            parts = line.strip().split(maxsplit=4)
            if len(parts) < 5:
                continue
            try:
                pid = int(parts[0])
                process_pgid = int(parts[1])
            except ValueError:
                continue
            if process_pgid != pgid or "Z" in parts[2]:
                continue
            candidates.append((pid, parts[3], parts[4]))

        if not candidates:
            return None
        pid, comm, command = sorted(candidates, key=lambda item: item[0])[0]
        return self._compact_command(command, comm)

    def _descendant_job_title(self) -> str | None:
        if self.pid is None:
            return None
        try:
            result = subprocess.run(
                ["/bin/ps", "-axo", "pid=,ppid=,stat=,comm=,command="],
                capture_output=True,
                text=True,
                timeout=0.2,
            )
        except Exception:
            return None
        if result.returncode != 0:
            return None

        children_by_parent: dict[int, list[tuple[int, str, str, str]]] = {}
        for line in result.stdout.splitlines():
            parts = line.strip().split(maxsplit=4)
            if len(parts) < 5:
                continue
            try:
                pid = int(parts[0])
                ppid = int(parts[1])
            except ValueError:
                continue
            if pid == self.pid or "Z" in parts[2]:
                continue
            children_by_parent.setdefault(ppid, []).append((pid, parts[2], parts[3], parts[4]))

        descendants: list[tuple[int, str, str, str]] = []
        stack = [self.pid]
        while stack:
            parent = stack.pop()
            for child in children_by_parent.get(parent, []):
                descendants.append(child)
                stack.append(child[0])

        foreground_descendants = [item for item in descendants if "+" in item[1]]
        if not foreground_descendants:
            return None
        pid, stat, comm, command = sorted(foreground_descendants, key=lambda item: item[0])[0]
        return self._compact_command(command, comm)

    def _compact_command(self, command: str, comm: str) -> str | None:
        command = command.strip()
        comm = os.path.basename(comm.strip())
        if not command:
            return comm or None
        pieces = command.split(maxsplit=1)
        head = os.path.basename(pieces[0])
        if not head:
            head = comm
        if len(pieces) == 1:
            return head or None
        return f"{head} {pieces[1]}".strip() or None

    def _command_title_from_input(self, value: str) -> str | None:
        command = value.replace("\r\n", "\n").replace("\r", "\n").strip().split("\n", 1)[0].strip()
        if not command:
            return None
        return command[:120]

    def _osc_rgb(self, color: str) -> str:
        color = color.lstrip("#")
        red = color[0:2]
        green = color[2:4]
        blue = color[4:6]
        return f"rgb:{red}{red}/{green}{green}/{blue}{blue}"

    def _skip_st_or_bell(self, text: str, start: int) -> int | None:
        bell = text.find("\x07", start)
        st = text.find("\x1b\\", start)
        candidates = [candidate for candidate in (bell, st) if candidate != -1]
        if not candidates:
            return None
        end = min(candidates)
        return end + (2 if end == st else 1)

    def _reply(self, value: str) -> None:
        if self.fd is None:
            return
        try:
            os.write(self.fd, value.encode("utf-8"))
        except Exception:
            pass

    def _ensure_cursor(self) -> None:
        while self.cursor_row >= len(self.lines):
            self.lines.append("")
            self.cell_lines.append([])
        self.cursor_row = max(0, self.cursor_row)
        self.cursor_col = max(0, self.cursor_col)

    def _blank_cells(self, count: int) -> list[dict[str, Any]]:
        return [self._cell(" ") for _ in range(max(0, count))]

    def _blank_row_cells(self) -> list[dict[str, Any]]:
        blank = self._cell(" ")
        return [dict(blank) for _ in range(self.columns)] if blank.get("bg") else []

    def _set_row_cells(self, row: int, cells: list[dict[str, Any]]) -> None:
        self.cell_lines[row] = self._trim_plain_trailing_blanks(cells)
        self.lines[row] = "".join(str(cell.get("ch") or " ") for cell in self.cell_lines[row]).rstrip()

    def _trim_plain_trailing_blanks(self, cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
        trimmed = list(cells)
        while trimmed and trimmed[-1].get("ch") == " " and not trimmed[-1].get("fg") and not trimmed[-1].get("bg") and not trimmed[-1].get("bold"):
            trimmed.pop()
        return trimmed

    def _reset_scroll_region(self) -> None:
        self.scroll_top = 0
        self.scroll_bottom = max(0, self.rows - 1)

    def _set_scroll_region(self, params: list[int]) -> None:
        if len(params) < 2:
            self._reset_scroll_region()
        else:
            top = max(0, params[0] - 1)
            bottom = max(top, min(self.rows - 1, params[1] - 1))
            self.scroll_top = top
            self.scroll_bottom = bottom
        self.cursor_row = 0
        self.cursor_col = 0
        self._ensure_cursor()

    def _index(self) -> None:
        if self.alt_screen and self.cursor_row == self.scroll_bottom:
            self._scroll_up(1)
        else:
            self.cursor_row += 1
            self._ensure_cursor()

    def _reverse_index(self) -> None:
        if self.alt_screen and self.cursor_row == self.scroll_top:
            self._scroll_down(1)
        else:
            self.cursor_row = max(0, self.cursor_row - 1)

    def _region_bounds(self) -> tuple[int, int]:
        top = max(0, min(self.scroll_top, self.rows - 1))
        bottom = max(top, min(self.scroll_bottom, self.rows - 1))
        while len(self.lines) <= bottom:
            self.lines.append("")
            self.cell_lines.append([])
        return top, bottom

    def _scroll_up(self, amount: int) -> None:
        if not self.alt_screen:
            return
        top, bottom = self._region_bounds()
        for _ in range(max(1, amount)):
            if top == 0:
                self._append_alt_scrollback(self.lines[top], self.cell_lines[top])
            del self.lines[top]
            del self.cell_lines[top]
            self.lines.insert(bottom, "")
            self.cell_lines.insert(bottom, self._blank_row_cells())

    def _scroll_down(self, amount: int) -> None:
        if not self.alt_screen:
            return
        top, bottom = self._region_bounds()
        for _ in range(max(1, amount)):
            del self.lines[bottom]
            del self.cell_lines[bottom]
            self.lines.insert(top, "")
            self.cell_lines.insert(top, self._blank_row_cells())

    def _put_char(self, char: str) -> None:
        self._ensure_cursor()
        cells = list(self.cell_lines[self.cursor_row])
        while len(cells) < self.cursor_col:
            cells.append(self._cell(" "))
        if self.cursor_col >= len(cells):
            cells.append(self._cell(char))
        else:
            cells[self.cursor_col] = self._cell(char)
        self._set_row_cells(self.cursor_row, cells)
        self.cursor_col += 1

    def _erase_line(self, mode: int) -> None:
        self._ensure_cursor()
        width = self.columns
        cells = list(self.cell_lines[self.cursor_row])
        if mode == 1:
            end = min(width, self.cursor_col + 1)
            while len(cells) < end:
                cells.append(self._cell(" "))
            for index in range(end):
                cells[index] = self._cell(" ")
            self._set_row_cells(self.cursor_row, cells)
        elif mode == 2:
            self._set_row_cells(self.cursor_row, self._blank_row_cells())
        else:
            start = min(width, self.cursor_col)
            if self.bg:
                while len(cells) < width:
                    cells.append(self._cell(" "))
                for index in range(start, width):
                    cells[index] = self._cell(" ")
                cells = cells[:width]
            else:
                cells = cells[:start]
            self._set_row_cells(self.cursor_row, cells)

    def _erase_display(self, mode: int) -> None:
        self._ensure_cursor()
        if mode in (2, 3):
            self._clear_screen()
            return

        if mode == 1:
            for row in range(self.cursor_row):
                self._set_row_cells(row, self._blank_row_cells())
            self._erase_line(1)
            return

        self._erase_line(0)
        if self.alt_screen:
            for row in range(self.cursor_row + 1, len(self.lines)):
                self._set_row_cells(row, self._blank_row_cells())
        else:
            self.lines = self.lines[: self.cursor_row + 1]
            self.cell_lines = self.cell_lines[: self.cursor_row + 1]

    def _erase_chars(self, amount: int) -> None:
        self._ensure_cursor()
        cells = list(self.cell_lines[self.cursor_row])
        start = min(self.columns, self.cursor_col)
        end = min(self.columns, start + max(1, amount))
        while len(cells) < end:
            cells.append(self._cell(" "))
        for index in range(start, end):
            cells[index] = self._cell(" ")
        self._set_row_cells(self.cursor_row, cells)

    def _insert_chars(self, amount: int) -> None:
        self._ensure_cursor()
        cells = list(self.cell_lines[self.cursor_row])
        start = min(self.columns, self.cursor_col)
        while len(cells) < start:
            cells.append(self._cell(" "))
        cells[start:start] = self._blank_cells(max(1, amount))
        self._set_row_cells(self.cursor_row, cells[: self.columns])

    def _delete_chars(self, amount: int) -> None:
        self._ensure_cursor()
        cells = list(self.cell_lines[self.cursor_row])
        start = min(len(cells), self.cursor_col)
        del cells[start : start + max(1, amount)]
        if self._cell(" ").get("bg"):
            while len(cells) < self.columns:
                cells.append(self._cell(" "))
        self._set_row_cells(self.cursor_row, cells[: self.columns])

    def _insert_lines(self, amount: int) -> None:
        if not self.alt_screen:
            return
        top, bottom = self._region_bounds()
        row = max(top, min(bottom, self.cursor_row))
        for _ in range(max(1, amount)):
            self.lines.insert(row, "")
            self.cell_lines.insert(row, self._blank_row_cells())
            del self.lines[bottom + 1]
            del self.cell_lines[bottom + 1]

    def _delete_lines(self, amount: int) -> None:
        if not self.alt_screen:
            return
        top, bottom = self._region_bounds()
        row = max(top, min(bottom, self.cursor_row))
        for _ in range(max(1, amount)):
            del self.lines[row]
            del self.cell_lines[row]
            self.lines.insert(bottom, "")
            self.cell_lines.insert(bottom, self._blank_row_cells())

    def _clear_screen(self) -> None:
        row_count = self.rows if self.alt_screen else 1
        self.cell_lines = [self._blank_row_cells() for _ in range(row_count)]
        self.lines = ["".join(str(cell.get("ch") or " ") for cell in row).rstrip() for row in self.cell_lines]
        self.cursor_row = 0
        self.cursor_col = 0
        self._reset_scroll_region()

    def _fit_alt_screen_to_size(self) -> None:
        while len(self.lines) < self.rows:
            self.lines.append("")
            self.cell_lines.append(self._blank_row_cells())
        if len(self.lines) > self.rows:
            self.lines = self.lines[: self.rows]
            self.cell_lines = self.cell_lines[: self.rows]
        self.cell_lines = [row[: self.columns] for row in self.cell_lines]
        self.lines = ["".join(str(cell.get("ch") or " ") for cell in row).rstrip() for row in self.cell_lines]

    def _enter_alt_screen(self) -> None:
        if self.alt_screen:
            return
        self.normal_state = (self.lines, self.cell_lines, self.cursor_row, self.cursor_col)
        self.alt_screen = True
        self.scrollback_lines = []
        self.scrollback_cell_lines = []
        self._reset_scroll_region()
        self._clear_screen()

    def _exit_alt_screen(self) -> None:
        if not self.alt_screen:
            return
        if self.normal_state:
            self.lines, self.cell_lines, self.cursor_row, self.cursor_col = self.normal_state
        self.normal_state = None
        self.alt_screen = False
        self.scrollback_lines = []
        self.scrollback_cell_lines = []
        self._reset_scroll_region()

    def _trim(self) -> None:
        if len(self.lines) <= self.config.max_transcript_lines:
            return
        removed = len(self.lines) - self.config.max_transcript_lines
        self.lines = self.lines[-self.config.max_transcript_lines :]
        self.cell_lines = self.cell_lines[-self.config.max_transcript_lines :]
        self.cursor_row = max(0, self.cursor_row - removed)

    def _append_alt_scrollback(self, line: str, cells: list[dict[str, Any]]) -> None:
        if not line and not cells:
            return
        self.scrollback_lines.append(line)
        self.scrollback_cell_lines.append([dict(cell) for cell in cells])
        if len(self.scrollback_lines) > self.config.max_transcript_lines:
            removed = len(self.scrollback_lines) - self.config.max_transcript_lines
            self.scrollback_lines = self.scrollback_lines[removed:]
            self.scrollback_cell_lines = self.scrollback_cell_lines[removed:]

    def _cell(self, char: str) -> dict[str, Any]:
        cell: dict[str, Any] = {"ch": char}
        fg = self.fg
        bg = self.bg
        if self.inverse:
            fg = self.bg or self.theme_bg
            bg = self.fg or self.theme_fg
        if fg:
            cell["fg"] = fg
        if bg:
            cell["bg"] = bg
        if self.bold:
            cell["bold"] = True
        if self.dim:
            cell["dim"] = True
        if self.italic:
            cell["italic"] = True
        return cell

    def _apply_sgr(self, params: list[int]) -> None:
        if not params:
            params = [0]

        index = 0
        while index < len(params):
            code = params[index]
            if code == 0:
                self.fg = None
                self.bg = None
                self.bold = False
                self.dim = False
                self.italic = False
                self.inverse = False
            elif code == 1:
                self.bold = True
            elif code == 2:
                self.dim = True
            elif code == 3:
                self.italic = True
            elif code == 22:
                self.bold = False
                self.dim = False
            elif code == 23:
                self.italic = False
            elif code == 7:
                self.inverse = True
            elif code == 27:
                self.inverse = False
            elif code == 39:
                self.fg = None
            elif code == 49:
                self.bg = None
            elif 30 <= code <= 37:
                self.fg = self.theme_ansi[code - 30]
            elif 90 <= code <= 97:
                self.fg = self.theme_ansi[8 + code - 90]
            elif 40 <= code <= 47:
                self.bg = self.theme_ansi[code - 40]
            elif 100 <= code <= 107:
                self.bg = self.theme_ansi[8 + code - 100]
            elif code in (38, 48) and index + 2 < len(params):
                target = "fg" if code == 38 else "bg"
                mode = params[index + 1]
                if mode == 5 and index + 2 < len(params):
                    setattr(self, target, xterm_256_color(params[index + 2], self.theme_ansi))
                    index += 2
                elif mode == 2 and index + 4 < len(params):
                    setattr(self, target, f"#{params[index + 2]:02x}{params[index + 3]:02x}{params[index + 4]:02x}")
                    index += 4
            index += 1

    def _report_device_status(self, params: list[int]) -> None:
        mode = params[0] if params else 0
        if mode == 5:
            self._reply("\x1b[0n")
        elif mode == 6:
            self._reply(f"\x1b[{self.cursor_row + 1};{self.cursor_col + 1}R")

    def _report_window_status(self, params: list[int]) -> None:
        mode = params[0] if params else 0
        if mode == 18:
            self._reply(f"\x1b[8;{self.rows};{self.columns}t")
        elif mode == 14:
            self._reply(f"\x1b[4;{self.rows * 18};{self.columns * 9}t")
        elif mode == 16:
            self._reply("\x1b[6;18;9t")


class RaytermDaemon:
    def __init__(self, config: DaemonConfig, socket_path: str):
        self.config = config
        self.socket_path = socket_path
        self.lock = threading.RLock()
        self.condition = threading.Condition(self.lock)
        self.revision = 0
        self.rows = config.visible_terminal_lines
        self.columns = config.terminal_columns
        self.theme: dict[str, Any] = {
            "foreground": DEFAULT_FG,
            "background": DEFAULT_BG,
            "ansi": list(DEFAULT_ANSI),
        }
        self.tabs: list[TerminalSession] = [TerminalSession(config, "Terminal 1", "terminal-0", 0, self._mark_changed)]
        self.tabs[0].set_theme(self.theme)
        self.next_index = 1

    def serve(self) -> None:
        try:
            os.unlink(self.socket_path)
        except FileNotFoundError:
            pass

        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(self.socket_path)
        os.chmod(self.socket_path, 0o600)
        server.listen(20)

        while True:
            connection, _ = server.accept()
            threading.Thread(target=self._serve_connection, args=(connection,), daemon=True).start()

    def _serve_connection(self, connection: socket.socket) -> None:
        with connection:
            data = b""
            while True:
                chunk = connection.recv(65536)
                if not chunk:
                    break
                data += chunk
            try:
                request = json.loads(data.decode("utf-8")) if data else {}
                response = self.handle(request)
            except Exception as error:
                response = {"ok": False, "error": str(error)}
            connection.sendall(json.dumps(response).encode("utf-8"))

    def handle(self, request: dict[str, Any]) -> dict[str, Any]:
        command = request.get("command")
        with self.lock:
            if command == "ping":
                return {"ok": True, "version": DAEMON_VERSION}
            if command == "state":
                return self.state()
            if command == "wait":
                return self.wait_for_update(request)
            if command == "resize":
                return self.resize(request)
            if command == "theme":
                return self.set_theme(request)
            if command == "send":
                return self.send(request)
            if command == "new":
                return self.new_tab()
            if command == "close":
                return self.close_tab(str(request.get("tabId") or ""))
            if command == "restart":
                return self.restart_tab(str(request.get("tabId") or ""))
            if command == "reset":
                return self.reset()
            return {"ok": False, "error": "unknown command"}

    def state(self) -> dict[str, Any]:
        self._ensure_tab()
        return {"ok": True, "version": DAEMON_VERSION, "revision": self.revision, "tabs": [tab.snapshot() for tab in self._active_tabs()]}

    def wait_for_update(self, request: dict[str, Any]) -> dict[str, Any]:
        try:
            revision = int(request.get("revision") or -1)
        except Exception:
            revision = -1
        try:
            timeout = max(0.05, min(5.0, float(request.get("timeoutMs") or 1000) / 1000.0))
        except Exception:
            timeout = 1.0

        deadline = time.monotonic() + timeout
        while self.revision <= revision:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            self.condition.wait(remaining)
        return self.state()

    def send(self, request: dict[str, Any]) -> dict[str, Any]:
        tab = self._find_tab(str(request.get("tabId") or ""))
        submitted_title = request.get("submittedTitle")
        if isinstance(submitted_title, str):
            title = tab._command_title_from_input(submitted_title)
            if title:
                tab.submitted_title = title
                if tab._refresh_display_title():
                    self._mark_changed_locked()
        ok = tab.send(str(request.get("data") or ""), filter_echo=bool(request.get("filterEcho")))
        return {"ok": ok, **self.state()}

    def resize(self, request: dict[str, Any]) -> dict[str, Any]:
        self.rows = max(1, int(request.get("rows") or self.rows))
        self.columns = max(1, int(request.get("columns") or self.columns))
        for tab in self._active_tabs():
            tab.resize(self.rows, self.columns)
        self._mark_changed_locked()
        return {"ok": True, **self.state()}

    def set_theme(self, request: dict[str, Any]) -> dict[str, Any]:
        theme = request.get("theme")
        if isinstance(theme, dict):
            foreground = theme.get("foreground")
            background = theme.get("background")
            ansi = theme.get("ansi")
            if isinstance(foreground, str) and isinstance(background, str) and isinstance(ansi, list) and len(ansi) >= 16:
                self.theme = {"foreground": foreground, "background": background, "ansi": list(ansi[:16])}
                for tab in self._active_tabs():
                    tab.set_theme(self.theme)
                self._mark_changed_locked()
        return {"ok": True, **self.state()}

    def new_tab(self) -> dict[str, Any]:
        tab = TerminalSession(self.config, f"Terminal {len(self._active_tabs()) + 1}", index=self.next_index, on_change=self._mark_changed)
        tab.set_theme(self.theme)
        tab.resize(self.rows, self.columns)
        self.next_index += 1
        self.tabs.append(tab)
        self._mark_changed_locked()
        return {"ok": True, "selectedId": tab.id, **self.state()}

    def close_tab(self, tab_id: str) -> dict[str, Any]:
        self._find_tab(tab_id).kill()
        self._ensure_tab()
        self._mark_changed_locked()
        return {"ok": True, **self.state()}

    def restart_tab(self, tab_id: str) -> dict[str, Any]:
        old = self._find_tab(tab_id)
        title, old_id, index = old.title, old.id, old.index
        old.kill()
        self.tabs = [tab for tab in self.tabs if tab.id != old_id]
        tab = TerminalSession(self.config, title, old_id, index, self._mark_changed)
        tab.set_theme(self.theme)
        tab.resize(self.rows, self.columns)
        self.tabs.append(tab)
        self._mark_changed_locked()
        return {"ok": True, **self.state()}

    def reset(self) -> dict[str, Any]:
        for tab in self.tabs:
            tab.kill()
        tab = TerminalSession(self.config, "Terminal 1", "terminal-0", 0, self._mark_changed)
        tab.set_theme(self.theme)
        tab.resize(self.rows, self.columns)
        self.tabs = [tab]
        self.next_index = 1
        self._mark_changed_locked()
        return {"ok": True, "selectedId": "terminal-0", **self.state()}

    def _active_tabs(self) -> list[TerminalSession]:
        return [tab for tab in self.tabs if not tab.closed]

    def _ensure_tab(self) -> None:
        if not self._active_tabs():
            tab = TerminalSession(self.config, "Terminal 1", "terminal-0", 0, self._mark_changed)
            tab.set_theme(self.theme)
            tab.resize(self.rows, self.columns)
            self.tabs.append(tab)

    def _find_tab(self, tab_id: str) -> TerminalSession:
        self._ensure_tab()
        for tab in self._active_tabs():
            if tab.id == tab_id:
                return tab
        return self._active_tabs()[0]

    def _mark_changed(self) -> None:
        with self.condition:
            self._mark_changed_locked()

    def _mark_changed_locked(self) -> None:
        self.revision += 1
        self.condition.notify_all()


def main() -> None:
    if len(sys.argv) != 3:
        print("usage: raytermd.py CONFIG SOCKET", file=sys.stderr)
        raise SystemExit(2)
    RaytermDaemon(DaemonConfig.load(sys.argv[1]), sys.argv[2]).serve()


if __name__ == "__main__":
    main()
