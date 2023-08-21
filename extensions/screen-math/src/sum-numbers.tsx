import { Detail, environment, showHUD, useNavigation } from "@raycast/api";
import { exec } from "child_process";
import { useState, useEffect } from "react";
import fs from "fs";
import { chmod } from "fs/promises";
import { join } from "path";

export default function command() {
  const { pop } = useNavigation();
  const [isLoading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [formattedTotal, setFormattedTotal] = useState("0.00");

  const locale = Intl.DateTimeFormat().resolvedOptions().locale;

  const handleError = (error: Error, message: string): void => {
    if (environment.isDevelopment) {
      console.log(error);
    }

    if (message) {
      showHUD(message).then();
    }

    setLoading(false);
    pop();
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

  const displayNumbers = (numbers: number[]): void => {
    const markdown = `
| **Numbers Found** |
| ------ |
${numbers.map((n) => `| ${formatNumber(n)} |`).join("\n")}`;

    setMarkdown(markdown);
  };

  /**
   * This is a workaround until Raycast API support openMainWindow()
   */
  const reopenRayCast = (): void => {
    exec("open raycast://reopen");
  };

  useEffect(() => {
    setLoading(true);

    showHUD("Select an area with numbers to sum them up.").then();

    const filename = `${environment.assetsPath}/sum-numbers-${Date.now()}.png`;

    exec(`/usr/sbin/screencapture -i -x ${filename}`, async (error) => {
      if (error) {
        handleError(error, "❌ There was an error while taking the screenshot.");

        return;
      }

      const command = join(environment.assetsPath, "screen-math");
      await chmod(command, "755");

      exec(`${command} ${filename}`, (error, stdout) => {
        if (error) {
          handleError(error, "❌ There was an error while processing the screenshot.");

          return;
        }

        reopenRayCast();

        const numbers = JSON.parse(stdout);
        const numbersFound = processNumbers(numbers);

        displayNumbers(numbersFound);

        const total = numbersFound.reduce((a, b) => a + b, 0);
        const formattedTotal = formatNumber(total);

        setFormattedTotal(formattedTotal);

        showHUD(`✅ Total is ${formattedTotal}`);

        if (fs.existsSync(filename)) {
          fs.unlinkSync(filename);
        }

        setLoading(false);
      });
    });
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total" text={formattedTotal} />
        </Detail.Metadata>
      }
    />
  );
}
