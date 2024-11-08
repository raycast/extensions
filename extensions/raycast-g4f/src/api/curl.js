// This is the CURL interface, which uses the command-line CURL utility to make requests.
// It is designed to be compatible with the existing node-fetch request format.
// The specification is as follows:
// 1. There is one command available in this interface: `curlRequest`.
// 2. The `curlRequest` function takes the following arguments: `url`, `options`, and `cb`.
// `url` and `options` are the same as in the node-fetch request format.
// `cb` is a callback function that is called upon each chunk of data received, as follows:
// cb(chunk: string) => void
// The `cb` function can do whatever it wants with the chunk of data, such as printing it
// or updating the response in a UI.
// 3. The `curlRequest` function returns a promise that resolves when the request is complete,
// or rejects if there is an error.
// 4. REQUIREMENT: The `curl` command must be available in the system PATH.

import { exec } from "child_process";
import { fetchToCurl } from "fetch-to-curl";

export const curlRequest = (url, options, cb) => {
  const curl_cmd = fetchToCurl(url, options) + " --silent --no-buffer";

  return new Promise((resolve, reject) => {
    const childProcess = exec(curl_cmd);

    childProcess.stdout.on("data", (chunk) => {
      chunk = chunk.toString().replace(/\r/g, "\n");
      cb(chunk);
    });

    childProcess.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`curl exited with code ${code}`));
      }
    });
  });
};
