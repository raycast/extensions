import { spawn } from "node:child_process";

export interface Result {
  title: string;
  url: string;
  summary: string;
}

function getNSEntry(cmdLine: string) {
  const n = cmdLine.split(" ");
  return n[n.length - 1];
}

export async function digByQuery(query: string, signal?: AbortSignal): Promise<Result[]> {
  try {
    const str = query.trim();
    const params: string[] = [];
    const output = [];
    const queryArr = str.split(" ");
    let data = "";

    // Check if string have options
    if (queryArr.length > 1) {
      const query = queryArr[0].trim();
      const option = queryArr[1].trim();

      params.push("-t", option, query);
    } else {
      params.push(str);
    }

    const child = spawn("host", params, { signal });
    child.stdout.setEncoding("utf-8");

    for await (const chunk of child.stdout) {
      data += chunk;
    }

    // Check for errors in data
    if (data.includes("not found")) {
      return Promise.resolve([]);
    }

    // Split lines into array:
    const execReturnDataArr = data.split("\n");

    // Loop stdout lines:
    for (const val of execReturnDataArr) {
      // Grab summary:
      const sum = getNSEntry(val);

      // If not empty push into x arr:
      if (val && sum) {
        output.push({
          title: val,
          summary: sum,
          url: "https://www.nslookup.io/dns-records/" + query,
        });
      }
    }

    return output;
  } catch (e) {
    return Promise.resolve([]);
  }
}
