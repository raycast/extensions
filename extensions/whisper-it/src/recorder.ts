import { record as nodeRecord } from "./node-recorder";
import temp from "temp";
import { cache, secret } from "./cache";
import fs from "fs";
import http from "http";
import fetch from "node-fetch";
import { Configuration, getConfig } from "./config";

export const record = async (): Promise<string> => {
  if (cache.get("recording")) {
    throw new Error("Already recording");
  }

  const config: Configuration = await getConfig();

  temp.track();
  const tempFile = await temp.open({
    suffix: `.${config.audioExtension}`,

    // Use the configured audio storage path
    dir: config.audioStoragePath,
  });

  cache.set("recording", tempFile.path);

  const recording = nodeRecord({
    sampleRate: 16000,
    channels: 1,
    audioType: config.audioExtension,
  });

  recording.start();
  recording.getStream().pipe(fs.createWriteStream(tempFile.path));

  return new Promise<string>((resolve) => {
    let hasFinished = false;
    const server = http
      .createServer((req, res) => {
        if (req.url === "/" + secret) {
          cache.remove("recording");
          recording.stop();
          res.statusCode = 200;
          res.end("Finished");
          finish();
          return;
        }

        res.statusCode = 404;
        res.end("Not found");
      })
      .listen(5050);

    // finish after 5min
    const timeout = setTimeout(
      () => {
        finish();
      },
      5 * 60 * 1000,
    );

    function finish() {
      if (hasFinished) return;
      hasFinished = true;
      clearTimeout(timeout);

      try {
        server.close();
      } catch (e) {
        console.error(e);
      }
      resolve(tempFile.path);
    }
  });
};

export const stopRecording = async () => {
  if (cache.get("recording")) {
    cache.remove("recording");
    await fetch(`http://localhost:5050/${secret}`).catch(() => null);

    return true;
  }

  return false;
};
