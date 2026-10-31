import { kilobat, Status } from "../kilobat";

type Input = {
  /** How many apps to return, busiest first. Defaults to 15. */
  limit?: number;
};

/** Apps and processes using the network now, with download and upload bytes per second and bytes this session. */
export default async function tool(input: Input) {
  const status = await kilobat<Status>(["status", "--json"]);
  const rate = (app: Status["apps"][number]) => app.downloadBytesPerSecond + app.uploadBytesPerSecond;
  return status.apps
    .sort((a, b) => rate(b) - rate(a) || b.sessionBytes - a.sessionBytes)
    .slice(0, input.limit ?? 15)
    .map(({ name, id, downloadBytesPerSecond, uploadBytesPerSecond, sessionBytes }) => ({
      name,
      id,
      downloadBytesPerSecond: Math.round(downloadBytesPerSecond),
      uploadBytesPerSecond: Math.round(uploadBytesPerSecond),
      sessionBytes,
    }));
}
