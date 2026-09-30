export function extractLogErrors(log: string | undefined): [string, string] {
  const normalLog: string[] = [];
  const errorLog: string[] = [];
  let isInErrorBlock = false;

  const logLines = log?.split("\n") ?? [];

  for (const line of logLines) {
    if (/ERROR|FAILED|Exception|Critical|error/i.test(line)) {
      isInErrorBlock = true;
      errorLog.push(line);
    } else if (isInErrorBlock) {
      errorLog.push(line);

      if (/\s+at /.test(line)) {
        continue;
      }

      isInErrorBlock = false;
    } else {
      normalLog.push(line);
    }
  }

  return [normalLog.join("\n"), errorLog.join("\n")];
}
