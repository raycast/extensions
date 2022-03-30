import { exec } from "child_process";

async function startLowLatencyStream(streamlinkLocation, quality, streamURL) {
  return new Promise((resolve, reject) => {
    const command = `${streamlinkLocation} twitch.tv/${streamURL} ${quality} --twitch-low-latency`;
    console.log(command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject("Failed to start stream");
      }
      if (stderr) {
        reject(stderr);
      }
      resolve(stdout);
    });
  });
}

function startStream(m3u8_url) {
  return new Promise((resolve, reject) => {
    const command = `open -a "Quicktime Player" "${m3u8_url}"`;
    console.log(command);

    exec(command, (error, _, stderr) => {
      if (error) {
        reject("Failed to start stream");
      }
      if (stderr) {
        reject(stderr);
      }
      resolve("Success");
    });
  });
}

function streamUsingM3U8(streamlinkLocation, quality, user_name) {
  return new Promise((resolve, reject) => {
    const command = `${streamlinkLocation} twitch.tv/${user_name} ${quality} --stream-url`;
    console.log(command);

    exec(command, (error, stdout, stderr) => {
      console.log(stdout);
      if (error) {
        reject("Failed to start stream");
      }
      if (stderr) {
        reject(stderr);
      }

      if (stdout.trim().endsWith(".m3u8")) {
        startStream(stdout);
      } else {
        reject("Stream is not available");
      }
    });
  });
}

export = {
  startStream,
  startLowLatencyStream,
  streamUsingM3U8,
};
