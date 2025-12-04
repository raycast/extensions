import { Color, Icon, Image } from "@raycast/api";
import { Connection } from "./api";
import { open } from "@raycast/api";
import { environment } from "@raycast/api";

export function getConnectionIcon(connection: Connection): Image.ImageLike {
  switch (connection.type) {
    case "stdio": {
      const config = getMCPServerConfig(connection);
      switch (config.command) {
        case "uvx":
          return "https://svgl.app/library/python.svg";
        case "npx":
          return "https://svgl.app/library/nodejs.svg";
        case "docker":
          return "https://svgl.app/library/docker.svg";
        case "deno":
          return { source: "https://svgl.app/library/deno.svg", tintColor: Color.PrimaryText };
        default:
          return Icon.Terminal;
      }
    }
    case "http":
      return Icon.Globe;
    case "ws":
      return Icon.Bolt;
  }
}

export function getMCPServerConfig(connection: Connection) {
  switch (connection.type) {
    case "stdio": {
      const stdioFunctionStr = connection.stdioFunction;
      const stdioFunction = new Function("config", `return (${stdioFunctionStr})(config)`);
      const { command, args, env } = stdioFunction(connection.exampleConfig);
      return { command, args, env };
    }
    case "http":
      return { url: connection.deploymentUrl };
    case "ws":
      return { url: connection.deploymentUrl };
  }
}

export function getConnectionTitle(connection: Connection) {
  switch (connection.type) {
    case "stdio":
      return "Standard Input/Output";
    case "http":
      return "HTTP";
    case "ws":
      return "WebSocket";
  }
}

export function getConnectionKey(connection: Connection) {
  switch (connection.type) {
    case "stdio":
      return connection.stdioFunction;
    case "http":
      return connection.deploymentUrl;
    case "ws":
      return connection.deploymentUrl;
  }
}

export async function addTextToAIChat(text: string) {
  const protocol = getDeeplinkProtocol();
  const encodedText = encodeURIComponent(text);
  const url = new URL(`${protocol}://ai-chat/add-text?text=${encodedText}`);
  await open(url.href);
}

function getDeeplinkProtocol() {
  if (environment.supportPath.includes("com.raycast.macos.debug")) {
    return "raycastdebug";
  } else if (environment.supportPath.includes("com.raycast.macos.internal")) {
    return "raycastinternal";
  } else {
    return "raycast";
  }
}
