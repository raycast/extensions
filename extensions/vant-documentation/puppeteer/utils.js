import path from "path";
import ora from "ora";

export const EN_US = "en-US";

export const ZH_CN = "zh-CN";

export const VERSION_4 = "v4";

export const VERSION_3 = "v3";

export const VERSION_2 = "v2";

export const VANT_WEBSITE = "https://vant.pro/vant";

export const VANT_VERSION_LIST = ["v4", "v3", "v2"];

export const DOCUMENTATION_PATH = "src/documentation";

export const pathResolve = (dir) => path.resolve(dir);

export class Log {
  constructor() {
    this.spinner = ora();
  }

  info(msg) {
    this.spinner.text = msg;
    this.spinner.start();
  }

  success(text) {
    this.spinner.succeed(text);
  }

  fail(text) {
    this.spinner.fail(text);
  }

  stop(text) {
    this.spinner.stop(text);
  }
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const whileDuration = (duration) => {
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    /* empty */
  }
};

export const measureTask = (task) => {
  const startTime = performance.now();
  return new Promise((resolve, reject) => {
    Promise.resolve(task())
      .then(() => {
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const data = duration.toFixed(2);
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
