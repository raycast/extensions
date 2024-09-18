import process from "node:process";
import pm2 from "pm2";
import meow from "meow";
import pick from "lodash/pick.js";
import { decodeParameters, handleError } from "./utils.js";

const chunkSize = 1024;
const exportedKeys = [
  "name",
  "pm_id",
  "pid",
  "pm2_env.namespace",
  "pm2_env.version",
  "pm2_env.exec_mode",
  "pm2_env._",
  "pm2_env.pm_pid_path",
  "pm2_env.pm_exec_path",
  "pm2_env.status",
  "pm2_env.pm_uptime",
  "pm2_env.username",
  "pm2_env.watch",
  "monit.cpu",
  "monit.memory",
];

const cli = meow({
  importMeta: import.meta,
  flags: {
    options: {
      type: "string",
    },
  },
});

const [command] = cli.input;
const { options } = cli.flags;

switch (command) {
  case "start": {
    pm2.start(decodeParameters(options), handleError);
    break;
  }

  case "list": {
    pm2.list((err, list) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      const listString = JSON.stringify(list.map((p) => pick(p, exportedKeys)));

      for (let i = 0; i < listString.length; i += chunkSize) {
        const chunk = listString.slice(i, i + chunkSize);
        process.stdout.write(chunk);
      }
      process.exit(0);
    });
    break;
  }

  case "stop": {
    pm2.stop(decodeParameters(options), handleError);
    break;
  }

  case "restart": {
    pm2.restart(decodeParameters(options), handleError);
    break;
  }

  case "reload": {
    pm2.reload(decodeParameters(options), handleError);
    break;
  }

  case "delete": {
    pm2.delete(decodeParameters(options), handleError);
    break;
  }

  default: {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
