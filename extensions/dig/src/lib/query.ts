import { useExec } from "@raycast/utils";

export type Result = {
  title: string;
  url: string;
  summary: string;
};

export type DataResult = {
  result: Result[];
  validDomain: boolean;
};

function getNSEntry(cmdLine: string) {
  const n = cmdLine.split(" ");
  return n[n.length - 1];
}

const useValidDomain = (query: string | null) => {
  if (query === null) {
    return true;
  }

  const queryArr = query.split(" ");
  const domainMatch = queryArr[0].match(
    /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,16}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi,
  );

  return !!domainMatch;
};

const useQueryParams = (query: string | null) => {
  if (query === null) {
    return [];
  }

  const str = query.trim();
  const params: string[] = [];
  const queryArr = str.split(" ");

  // Check if string have options
  if (queryArr.length > 1) {
    const query = queryArr[0].trim();
    const option = queryArr[1].trim();

    params.push("-t", option, query);
  } else {
    params.push(str);
  }

  return params;
};

export const useDigByQuery = (query: string | null) => {
  const validDomain = useValidDomain(query);

  const {
    isLoading,
    data: execData,
    error,
    revalidate,
  } = useExec("host", useQueryParams(query), {
    execute: !!query && validDomain,
    parseOutput: ({ stdout }) => {
      if (stdout.includes("not found")) {
        return [];
      }

      const output: Result[] = [];

      stdout.split("\n").forEach((line) => {
        const summary = getNSEntry(line);
        if (line && summary) {
          output.push({
            title: line,
            summary,
            url: "https://www.nslookup.io/dns-records/" + query,
          });
        }
      });

      return output.sort((a, b) => a.title.localeCompare(b.title));
    },
  });

  const data: DataResult = {
    result: execData || [],
    validDomain,
  };

  return { isLoading, data, error, revalidate };
};
