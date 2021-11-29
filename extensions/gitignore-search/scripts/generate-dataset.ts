import fetch from "cross-fetch";
import fs from "fs";
import path from "path";

const API_URL = "https://gitignore-fetch.superhighfives.workers.dev";
const CONTENT_URL = "http://raw.githubusercontent.com/github/gitignore/master";
const IGNORE_FILES = ["Clojure.gitignore", "Fortran.gitignore", "Kotlin.gitignore"];

async function fetchFiles() {
  try {
    const response = await fetch(API_URL);
    const json = await response.json();
    return json as Record<string, unknown> as unknown as GitIgnore[];
  } catch (error) {
    throw new Error(error as string);
  }
}

(async function main() {
  try {
  const files = await fetchFiles();
  files
    .filter((file) => path.parse(file.path).ext === ".gitignore")
    .filter((file) => !IGNORE_FILES.includes(file.path))
    .forEach(async file => {
      const response = await fetch(`${CONTENT_URL}/${file.path}`);
      const text = await response.text();
      fs.writeFileSync(`${__dirname}/../assets/gitignore/${file.path}`, text);
    })
  } catch (error) {
    throw new Error(error as string);
  }
})();


type GitIgnore = {
  sha: string;
  name: string;
  path: string;
  download_url: string;
  type: string;
};
