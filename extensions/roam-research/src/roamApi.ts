import { spawn } from "child_process";
import dayjs from "dayjs";
import { parseTemplate } from "./parse-template";
import type { ReversePullBlock } from "./type";
import { todayUid } from "./utils";

const api =
  (graphName: string, graphToken: string) =>
  <T>(operationName: string) =>
  (query: string) =>
    new Promise<RoamResponse<T>>((resolve, reject) => {
      const spawnProcess = spawn("curl", [
        "-X",
        "POST",
        `https://api.roamresearch.com/api/graph/${graphName}/${operationName}`,
        "--location-trusted",
        "-H",
        "accept: application/json",
        "-H",
        `Authorization: Bearer ${graphToken}`,
        "-H",
        "Content-Type: application/json; charset=UTF-8",
        // "Content-Type: text/html; charset=UTF-8",
        "-d",
        query,
      ]);
      console.log(query, "---");
      let d = "";
      let result = "";
      spawnProcess.stdout.on("data", (data) => {
        console.log("DATA RECEIVED");
        // console.log(data.toString("utf8"));
        result += data;
      });

      spawnProcess.stdout.on("close", () => {
        if (result) {
          console.log("DONE", " =d", result);

          try {
            const json = JSON.parse(result);
            if (json.message) {
              reject(json);
              return;
            }
            resolve(json);
          } catch (e) {
            reject(e);
          }
        }
        resolve({ result: true as T, messgae: "ok" });
      });

      spawnProcess.stderr.on("data", function (data) {
        console.log("ON DATA", data.length);
        d += data.toString("utf8");
        // console.log(data.toString("utf8"), typeof data);
        // console.log(data.toString());
      });

      spawnProcess.on("error", (error) => {
        console.log("ON ERROR");
        reject(JSON.stringify(error));
      });
    });

export const graphApi = (graphName: string, graphToken: string) => {
  const apiInterface = {
    q: <T>(query: string, args?: string) =>
      api(graphName, graphToken)<T>("q")(
        JSON.stringify({
          query: query,
          args: args,
        })
      ),
    pull: api(graphName, graphToken)("pull"),
    write: (command: string) => api(graphName, graphToken)<boolean>("write")(command),
    batch: (command: string) => api(graphName, graphToken)<boolean>("write")(command),
  };
  return apiInterface;
};

const BLOCK_QUERY = `:block/string :node/title :block/uid :edit/time :create/time :block/_refs {:block/_children ...}`;

export const apiActions = (api: ReturnType<typeof graphApi>) => {
  return {
    appendToDailyNote(content: string, template: string, date: Date) {
      if (template && template.startsWith("-")) {
        const replaceDate = (s: string) => {
          return s.replaceAll(/\{date:?([^}]+)?\}/gi, (a1: string, a2 = "HH:mm") => {
            return dayjs(date).format(a2);
          });
        };
        const replaceContent = (s: string) => {
          return s.replaceAll(/\{content}/gi, content);
        };

        return api.batch(
          JSON.stringify({
            action: "batch-actions",
            // actions: replaceContent(replaceDate(JSON.stringify(parseTemplate(template)))),
            actions: parseTemplate(replaceContent(replaceDate(template))),
          })
        );
      }
      return api.write(
        JSON.stringify({
          action: "create-block",
          location: {
            "parent-uid": todayUid(),
            order: "last",
          },
          block: {
            string: content,
          },
        })
      );
    },
    randomBlock() {
      console.log("q = ");

      return api.q(
        "[ :find [(rand 1 ?block-uid) (pull ?e [*]  ) ]     :where [?e :block/page] [?e :block/uid ?block-uid] ]"
      );
    },
    getAllBlocks() {
      return api.q<ReversePullBlock[][]>(`[ :find [(pull ?e [${BLOCK_QUERY}]) ...] :where [?e :block/uid]]`);
    },
    getMentioning(uid: string) {
      return api.q<ReversePullBlock[]>(
        `[ :find [(pull ?e [${BLOCK_QUERY}]) ...]  :where [?page :block/uid  "${uid}"] [?e :block/refs ?page] [?e :block/string ?text]]`
      );
    },
  };
};

export function graphApiInitial(graphName: string, token: string) {
  return apiActions(graphApi(graphName, token));
}
