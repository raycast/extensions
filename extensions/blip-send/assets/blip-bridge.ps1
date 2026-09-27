# Bridges a Windows named pipe to Blip's AF_UNIX RPC socket.
#
# Node on Windows cannot open an AF_UNIX socket: net.connect() treats the path as a
# named pipe and fails with EACCES. The .NET Framework that ships with every Windows
# install can open one, so this script accepts named pipe connections and pumps bytes
# between each one and a fresh connection to Blip's socket.
#
# It prints "ready" on stdout once the first pipe instance is listening, and exits when
# its stdin closes, so it cannot outlive the Raycast command that started it.

param(
  [Parameter(Mandatory = $true)][string]$PipeName,
  [Parameter(Mandatory = $true)][string]$SocketPath
)

$ErrorActionPreference = "Stop"

$source = @'
using System;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

/// EndPoint for AF_UNIX. .NET Framework has no UnixDomainSocketEndPoint, but Winsock
/// on Windows 10 1803 and later accepts a sockaddr_un, so serialising one by hand works.
public class UnixEndPoint : EndPoint
{
    private readonly string path;

    public UnixEndPoint(string path) { this.path = path; }

    public override AddressFamily AddressFamily { get { return AddressFamily.Unix; } }

    public override SocketAddress Serialize()
    {
        byte[] bytes = Encoding.UTF8.GetBytes(path);
        SocketAddress address = new SocketAddress(AddressFamily.Unix, 2 + bytes.Length + 1);
        for (int i = 0; i < bytes.Length; i++) address[2 + i] = bytes[i];
        address[2 + bytes.Length] = 0;
        return address;
    }

    public override EndPoint Create(SocketAddress socketAddress) { return this; }

    public override string ToString() { return path; }
}

public static class BlipBridge
{
    private static string pipeName;
    private static string socketPath;

    public static void Run(string pipe, string socket)
    {
        pipeName = pipe;
        socketPath = socket;

        // Connect once before announcing readiness, so the caller learns straight away
        // that Blip is not reachable instead of finding out on its first RPC.
        using (Socket probe = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified))
        {
            probe.Connect(new UnixEndPoint(socketPath));
        }

        NamedPipeServerStream server = CreateServer();
        Console.Out.WriteLine("ready");
        Console.Out.Flush();

        Thread watchdog = new Thread(WatchStdin);
        watchdog.IsBackground = true;
        watchdog.Start();

        for (;;)
        {
            server.WaitForConnection();
            NamedPipeServerStream connected = server;
            // Listen again before serving, so back-to-back RPCs never find the pipe missing.
            server = CreateServer();
            Thread worker = new Thread(delegate() { Serve(connected); });
            worker.IsBackground = true;
            worker.Start();
        }
    }

    private static NamedPipeServerStream CreateServer()
    {
        // Asynchronous opens the handle for overlapped I/O. Without it Windows serialises
        // operations on the handle, so the blocking read of the request would hold up the
        // write of the response and the RPC would never finish.
        return new NamedPipeServerStream(
            pipeName,
            PipeDirection.InOut,
            NamedPipeServerStream.MaxAllowedServerInstances,
            PipeTransmissionMode.Byte,
            PipeOptions.Asynchronous);
    }

    /// Exits when the parent closes stdin, which happens when the Raycast command ends.
    private static void WatchStdin()
    {
        Stream input = Console.OpenStandardInput();
        byte[] scratch = new byte[256];
        try
        {
            while (input.Read(scratch, 0, scratch.Length) > 0) { }
        }
        catch (Exception) { }
        Environment.Exit(0);
    }

    private static void Serve(NamedPipeServerStream pipe)
    {
        Socket socket = null;
        try
        {
            socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
            socket.Connect(new UnixEndPoint(socketPath));
            NetworkStream stream = new NetworkStream(socket, false);

            Thread upstream = new Thread(delegate() { Pump(pipe, stream, socket, pipe); });
            upstream.IsBackground = true;
            upstream.Start();
            Pump(stream, pipe, socket, pipe);
            upstream.Join(2000);
        }
        catch (Exception) { }
        finally
        {
            Close(socket, pipe);
        }
    }

    private static void Pump(Stream from, Stream to, Socket socket, NamedPipeServerStream pipe)
    {
        byte[] buffer = new byte[65536];
        try
        {
            for (;;)
            {
                int read = from.Read(buffer, 0, buffer.Length);
                if (read <= 0) break;
                to.Write(buffer, 0, read);
                to.Flush();
            }
        }
        catch (Exception) { }
        // Either direction ending means the RPC is over: tear both sides down so the
        // opposite pump cannot block forever on a read that will never complete.
        Close(socket, pipe);
    }

    private static void Close(Socket socket, NamedPipeServerStream pipe)
    {
        try { if (socket != null) socket.Close(); } catch (Exception) { }
        try { if (pipe != null) pipe.Close(); } catch (Exception) { }
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp

try {
  [BlipBridge]::Run($PipeName, $SocketPath)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
