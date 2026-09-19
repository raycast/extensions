import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./create-server";
import { createServerOptionsFromEnvironment } from "./runtime-options";

const options = createServerOptionsFromEnvironment();

serveStdio(() => createServer(options));
