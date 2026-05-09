import net from "node:net";

export async function assertOAuthCallbackPortAvailable(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            "OAuth callback port 1455 is already in use. Stop the process using it and retry sign-in.",
          ),
        );
        return;
      }
      reject(error);
    });
    server.listen(1455, "localhost", () => {
      server.close(() => resolve());
    });
  });
}
