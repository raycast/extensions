import { ensureCLI } from "../lib/cli";
import { runSpeedTestOnce } from "../lib/speedtest";
import { speedToString } from "../lib/utils";

/** Run a new Ookla speed test and return the final connection measurements. */
export default async function runSpeedtest() {
  await ensureCLI();

  const result = await runSpeedTestOnce();

  return {
    download: speedToString(result.download.bandwidth),
    upload: speedToString(result.upload.bandwidth),
    pingMs: result.ping.latency,
    jitterMs: result.ping.jitter,
    packetLossPercent: result.packetLoss,
    isp: result.isp,
    server: `${result.server.name}, ${result.server.location}`,
    resultUrl: result.result.url,
  };
}
