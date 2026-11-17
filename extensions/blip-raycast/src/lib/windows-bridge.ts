/**
 * On Windows, Blip's engine listens on a Unix-domain socket file (%TEMP%\net.blip.desktop\sock).
 * Node can't open those on Windows (it only speaks named pipes there), but .NET can. So the
 * extension starts a small PowerShell process (C# source below, compiled by PowerShell's Add-Type)
 * that listens on a private named pipe and relays each connection to Blip's socket.
 *
 * Each relayed connection starts with one status byte: 1 = connected to Blip, 0 = Blip isn't
 * listening (reported to the client as ECONNREFUSED, so it can start Blip as usual).
 * The bridge exits when the extension's process does (its stdin closes).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import type { Duplex } from "node:stream";

const LISTENERS = 8;
const START_TIMEOUT_MS = 20000;

const BRIDGE_SOURCE = `
using System;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public class BlipUnixEndPoint : EndPoint {
  private readonly string path;
  public BlipUnixEndPoint(string path) { this.path = path; }
  public override AddressFamily AddressFamily { get { return AddressFamily.Unix; } }
  public override SocketAddress Serialize() {
    byte[] bytes = Encoding.UTF8.GetBytes(path);
    SocketAddress address = new SocketAddress(AddressFamily.Unix, 2 + 108);
    for (int i = 0; i < bytes.Length && i < 107; i++) address[2 + i] = bytes[i];
    return address;
  }
  public override EndPoint Create(SocketAddress address) { return this; }
}

public static class BlipBridge {
  public static void Run(string socketPath, string pipeName, int listeners) {
    CountdownEvent ready = new CountdownEvent(listeners);
    for (int i = 0; i < listeners; i++) {
      Thread thread = new Thread(delegate () { Listen(socketPath, pipeName, listeners, ready); });
      thread.IsBackground = true;
      thread.Start();
    }
    ready.Wait();
    Console.Out.WriteLine("READY");
    Console.Out.Flush();
    try { Console.In.ReadToEnd(); } catch { }
  }

  static void Listen(string socketPath, string pipeName, int listeners, CountdownEvent ready) {
    bool first = true;
    while (true) {
      NamedPipeServerStream pipe = new NamedPipeServerStream(
        pipeName, PipeDirection.InOut, listeners, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
      if (first) { ready.Signal(); first = false; }
      try { pipe.WaitForConnection(); } catch { pipe.Dispose(); continue; }
      Serve(pipe, socketPath);
    }
  }

  static void Serve(NamedPipeServerStream pipe, string socketPath) {
    Socket socket = null;
    try {
      socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
      try {
        socket.Connect(new BlipUnixEndPoint(socketPath));
      } catch {
        pipe.WriteByte(0);
        pipe.Flush();
        return;
      }
      pipe.WriteByte(1);
      pipe.Flush();
      NetworkStream network = new NetworkStream(socket, false);
      Socket current = socket;
      Thread upstream = new Thread(delegate () { Pump(pipe, network, current); });
      upstream.IsBackground = true;
      upstream.Start();
      Pump(network, pipe, socket);
    } catch {
    } finally {
      try { pipe.Dispose(); } catch { }
      try { if (socket != null) socket.Close(); } catch { }
    }
  }

  static void Pump(Stream from, Stream to, Socket socket) {
    byte[] buffer = new byte[65536];
    try {
      int read;
      while ((read = from.Read(buffer, 0, buffer.Length)) > 0) { to.Write(buffer, 0, read); to.Flush(); }
    } catch { }
    try { socket.Shutdown(SocketShutdown.Both); } catch { }
  }
}
`;

const BRIDGE_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
${BRIDGE_SOURCE}
'@
[BlipBridge]::Run($env:BLIP_SOCKET, $env:BLIP_PIPE, ${LISTENERS})
`;

interface Bridge {
  socketPath: string;
  pipe: Promise<string>;
  child: ChildProcess;
}

let bridge: Bridge | undefined;

function startBridge(socketPath: string): Bridge {
  const pipeName = `blip-raycast-${process.pid}-${randomUUID()}`;
  const child = spawn(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      Buffer.from(BRIDGE_SCRIPT, "utf16le").toString("base64"),
    ],
    { env: { ...process.env, BLIP_SOCKET: socketPath, BLIP_PIPE: pipeName }, windowsHide: true },
  );
  const pipe = new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("The Windows connection helper didn't start.")), START_TIMEOUT_MS);
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("READY")) {
        clearTimeout(timer);
        resolve(`\\\\.\\pipe\\${pipeName}`);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      if (bridge?.child === child) bridge = undefined;
      reject(new Error(`The Windows connection helper stopped. ${output.trim()}`.trim()));
    });
  });
  // Don't keep the extension's process alive just for the bridge; it exits with us (its stdin closes).
  child.unref();
  for (const stream of [child.stdin, child.stdout, child.stderr]) {
    (stream as unknown as { unref?: () => void } | null)?.unref?.();
  }
  return { socketPath, pipe, child };
}

/** Opens a connection to Blip's socket through the bridge (started on first use). */
export async function connectThroughBridge(socketPath: string): Promise<Duplex> {
  if (!bridge || bridge.socketPath !== socketPath) {
    bridge?.child.kill();
    bridge = startBridge(socketPath);
  }
  const pipePath = await bridge.pipe;
  return new Promise<Duplex>((resolve, reject) => {
    const socket = createConnection({ path: pipePath });
    socket.once("error", reject);
    socket.once("data", (chunk: Buffer) => {
      socket.off("error", reject);
      if (chunk[0] !== 1) {
        socket.destroy();
        return reject(Object.assign(new Error("Blip isn't listening"), { code: "ECONNREFUSED" }));
      }
      if (chunk.length > 1) socket.unshift(chunk.subarray(1));
      resolve(socket);
    });
  });
}
