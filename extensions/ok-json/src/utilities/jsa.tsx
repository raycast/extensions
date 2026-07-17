import { showToast, Toast } from "@raycast/api";
import osascript from "osascript-tag";

export interface Script {
  id: string;
  name: string;
  description: string;
  path: string;
}

export const executeJxa = async (script: string, list?: string[]) => {
  try {
    const result = await osascript.jxa({ parse: true, argv: list })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === "string") {
      const message = err.replace("execution error: Error: ", "");
      if (message.match(/Application can't be found/)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Application not found",
          message: "Things must be running",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: message,
        });
      }
    }
  }
};

export const getScripts = () => {
  return executeJxa(`
		const okjson = Application('net.shinystone.OKJSON');
		return okjson.scripts().map(val => {
			return {
				id: val.id(),
				name: val.name(),
				icon: val.icon(),
				description: val.scriptdescription(),
				path: val.path(),
			}
		})
	`);
};

export const runScript = (scriptID: string, input?: string) => {
  if (input) {
    return executeJxa(
      `
		const okjson = Application('net.shinystone.OKJSON');
    const input = argv[0]
		okjson.runScript("${scriptID}", { with: input })
	`,
      [input],
    );
  } else {
    return executeJxa(`
		const okjson = Application('net.shinystone.OKJSON');
		okjson.runScript("${scriptID}")
	`);
  }
};

export const runcURLCommand = (string: string) => {
  return executeJxa(
    `
		const okjson = Application('net.shinystone.OKJSON');
    const text = argv[0]
		okjson.runCURLCommand(text)
	`,
    [string],
  );
};

export const viewFromURLScript = (string: string) => {
  return executeJxa(
    `
    const okjson = Application('net.shinystone.OKJSON');
    const text = argv[0]
    okjson.viewFromURL(text)
	`,
    [string],
  );
};
