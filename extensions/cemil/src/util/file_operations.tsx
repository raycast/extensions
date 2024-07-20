import fs from "fs";
import { Config } from "./interfaces";

export const readConfigFile = (filePath: string, sortAlphabetically: boolean): Promise<Config> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        try {
          const parsedData: Config = JSON.parse(data);

          if (sortAlphabetically) {
            parsedData.projects?.sort((a, b) => a.name.localeCompare(b.name));
            parsedData.grafanaDashboards?.sort((a, b) => a.name.localeCompare(b.name));
            parsedData.databases?.sort((a, b) => a.name.localeCompare(b.name));
            parsedData.customLinks?.sort((a, b) => a.name.localeCompare(b.name));
            parsedData.templates?.sort((a, b) => a.name.localeCompare(b.name));
          }

          resolve(parsedData);
        } catch (parseError) {
          reject(parseError);
        }
      }
    });
  });
};