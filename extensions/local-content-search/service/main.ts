import { createService } from "./server";
import { paths } from "./paths";

// launchd supervises this lightweight host; native workers exist only while working.
async function main(): Promise<void> {
  const service = await createService(paths(process.env.LOCAL_SEARCH_HOME));
  let stopping = false;
  const stop = () => {
    if (stopping) {
      return;
    }
    stopping = true;
    void service.close().then(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  console.log(`Local Search ready: ${service.socket}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
