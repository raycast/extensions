import fs from "fs";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getBunchesContent = (bunchFolder: string, bunchesName: string) => {
  try {
    const bunchesPath = bunchFolder + "/" + bunchesName + ".bunch";
    const _bunchesContent = fs.readFileSync(bunchesPath, "utf-8");
    return `\`\`\`
${_bunchesContent}
\`\`\``;
  } catch (e) {
    console.error(String(e));
    return String(e);
  }
};

export const bunchInstalled = () => {
  try {
    return fs.existsSync("/Applications/Bunch.app");
  } catch (e) {
    console.error(String(e));
    return false;
  }
};
