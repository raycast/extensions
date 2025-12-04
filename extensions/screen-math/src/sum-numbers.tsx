import { Clipboard, environment, popToRoot, showHUD } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import { chmod } from "fs/promises";
import { join } from "path";

export default async function command() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;

  const handleError = (error: Error, message: string): void => {
    if (environment.isDevelopment) {
      console.log(error);
    }

    if (message) {
      showHUD(message).then();
    }

    popToRoot({ clearSearchBar: true });
  };

  const formatNumber = (n: number): string => {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(n);
  };

  const processNumbers = (strings: string[]): number[] => {
    const numbersFound = [];

    for (let i = 0; i < strings.length; i++) {
      let s = strings[i];

      // Remove anything that is not a number except for the decimal point
      s = s.replace(/[^0-9.]/g, "");

      const n = parseFloat(s);
      if (!isNaN(n)) {
        numbersFound.push(n);
      }
    }

    return numbersFound;
  };

  const getScreenshot = async (filename: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      exec(`/usr/sbin/screencapture -i -x ${filename}`, async (error) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  };

  const findNumbers = async (filename: string): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      exec(`${command} ${filename}`, (error, stdout) => {
        if (error) {
          handleError(error, "❌ There was an error while processing the screenshot.");

          reject(error);
        }

        if (environment.isDevelopment) {
          console.log(stdout);
        }

        // Remove surrounding brackets and split into an array
        const stringWithoutBrackets = stdout.slice(1, -1);
        const stringArray = stringWithoutBrackets.split(", ");

        // Trim whitespace from each element and store in a new array
        const trimmedArray = stringArray.map((item) => item.trim());

        // const numbers = JSON.parse(stdout);
        const numbersFound = processNumbers(trimmedArray);

        resolve(numbersFound);
      });
    });
  };

  await showHUD("Select an area with numbers to sum them up.");

  const filename = `${environment.assetsPath}/sum-numbers-${Date.now()}.png`;

  await getScreenshot(filename).catch((error) => {
    handleError(error, "❌ There was an error while taking the screenshot.");

    return;
  });

  const command = join(environment.assetsPath, "screen-math");
  await chmod(command, "755");

  if (!fs.existsSync(filename)) {
    return;
  }

  const numbersFound = await findNumbers(filename);

  const total = numbersFound.reduce((a, b) => a + b, 0);
  const formattedTotal = formatNumber(total);

  await showHUD(`✅ Total is ${formattedTotal}`);

  await Clipboard.copy(`${numbersFound.join("\n")}\n\nTotal\n${total}`);

  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }
}
