import {
  ActionPanel,
  Action,
  List,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
  environment,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ChildProcess, ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import path from "node:path";
import { accessSync, copyFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

// TODO
// - better parse result
// - autmate: ask user perm to download & install qalc ?
// -x persistent qalc + restart ?
// -x out colors + fmt

// --------  os interface

function ensureCfg() {
  const cfgFile = "qalc.cfg";
  const cfgPath = path.join(environment.supportPath, cfgFile);
  try {
    accessSync(cfgPath);
  } catch {
    const cfgAsset = path.join(environment.assetsPath, cfgFile);
    copyFileSync(cfgAsset, cfgPath);
  }
}

async function loadHistory(): Promise<[string, string][]> {
  const historyPath = path.join(environment.supportPath, "qalc.history");
  try {
    const histFile = await readFile(historyPath, { encoding: "utf-8" });
    const hist: [string, string][] = [];
    for (const line of histFile.split("\n")) if (line) hist.push([line, "― "]);
    return hist.reverse();
  } catch {
    return [];
  }
}

function spawnQalc(
  pathsToTry: string[],
  callback: (process: ChildProcessWithoutNullStreams) => void,
  setErr: (arg0: [string, Error][]) => void,
  isDead: [0 | 1],
  errors: [string, Error][] = [],
) {
  const p = spawn(pathsToTry[0], [], { env: { ...process.env, QALCULATE_USER_DIR: environment.supportPath } }); // Start qalc
  p.on("error", (err) => {
    errors.push([pathsToTry[0], err]);
    if (!isDead[0] && pathsToTry.length > 1) spawnQalc(pathsToTry.slice(1), callback, setErr, isDead, errors);
    else setErr(errors);
  });
  if (isDead[0]) p.stdin.end();
  else callback(p);
}

function processMsg(s: string): string[] {
  /*eslint no-control-regex: "off"*/
  //console.log(s);
  s = s
    .replaceAll(/\x1B\[[0-9]+(;[0-9]+)?m/g, "") // Colors and style
    .replaceAll("\x1B[0J", "") // Erase all (when modifying input)
    .replaceAll(/\x1B\[[0-9]+[AG]/g, ""); // Move cursor (when modifying input)
  const lines = [];
  let bracketD = 0;
  for (const line of s.split("\n")) {
    if (!line) continue;
    if (line.trim() === ">") continue;
    let ate = 0;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === "(") bracketD++;
      else if (char === ")") bracketD = Math.max(0, bracketD - 1);
      else if (bracketD == 0 && (char === "=" || char === "≈")) {
        lines.push(line.slice(ate, i));
        ate = i;
      }
    }
    const rest = line.slice(ate);
    const restt = rest.trim();
    if (rest && restt !== "=" && restt !== "≈") lines.push(rest);
  }
  if (lines.length == 0) lines.push(""); // To be able to submit it
  //console.log(lines);
  return lines;
}

// --------  UI

function usePreviousState<T>(v: T): T {
  const r = useRef<T>(v);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r.current;
}

const historyAnsPlaceholder = "⏳";
export default function Command() {
  // In case the user changes executable, we need to restart everything
  const [render, rerender] = useState(0);
  return <ActualCommand key={render} rerender={() => rerender(render + 1)}></ActualCommand>;
}
function ActualCommand(props: { rerender: () => void }) {
  const preferences = getPreferenceValues();
  const [qalcProcess, setQalcProcess] = useState<ChildProcess | undefined>(undefined); // The interactive process
  const [searchText, setSearchText] = useState("");
  const prevSearchText = usePreviousState(searchText);
  const [data, setData] = useState<{ a: string[]; loading: boolean }>({ a: [], loading: true }); // Response
  const [err404, set404] = useState<[string, Error][] | false>(false);
  const history = useRef<{ a: [string, string][]; loading: boolean }>({ a: [], loading: true }); // Calculation history
  //console.log(data);

  function onQalcData(data: Buffer) {
    const rawData = data.toString("utf-8");
    if (rawData === "\x1B[0J") return;
    //console.log("Dataa: %s", rawData);
    const parsedLines = processMsg(rawData);
    //console.log("Lines: %s", parsedLines);
    const lastLine = parsedLines[parsedLines.length - 1];
    if (lastLine && history.current.a.length)
      if (history.current.a[0][1] === historyAnsPlaceholder) history.current.a[0][1] = lastLine; // Fill history ans
    setData({ a: parsedLines, loading: false });
  }

  function onExecute() {
    if (searchText.trim().length > 0) history.current.a.unshift([searchText, historyAnsPlaceholder]);
    qalcProcess?.stdin?.write("\x08".repeat(searchText.length) + searchText + "\n");
  }

  useEffect(() => {
    // Process control
    const pathsToTry = [
      preferences["qalcPath"],
      preferences["qalcPathText"],
      preferences["qalcPathText"] + (preferences["qalcPathText"].endsWith("/") ? "qalc" : "/qalc"),
    ];
    const isDead: [0 | 1] = [0];
    let destructor = () => (isDead[0] = 1) as unknown;
    ensureCfg();
    loadHistory().then((hist) => {
      // Strict mode does this twice, but with same Ref, so dedup
      if (history.current.loading) {
        history.current.loading = false;
        history.current.a = [...history.current.a, ...hist];
      }
    });
    spawnQalc(
      pathsToTry,
      (p) => {
        p.stdout.on("data", onQalcData);
        setQalcProcess(p);
        destructor = () => p.stdin.end();
      },
      set404,
      isDead,
    );
    return () => destructor() as void; // Quit qalc
  }, []);
  useEffect(() => {
    // Interactive input
    if (qalcProcess?.stdin?.writable) {
      //console.log("Writing %s", searchText);
      if (searchText.length > prevSearchText.length && searchText.startsWith(prevSearchText))
        qalcProcess.stdin.write(searchText.slice(prevSearchText.length));
      else if (searchText.length < prevSearchText.length && prevSearchText.startsWith(searchText))
        qalcProcess.stdin.write("\x08".repeat(prevSearchText.length - searchText.length));
      else qalcProcess.stdin.write("\x08".repeat(prevSearchText.length) + searchText);
    }
  }, [searchText, qalcProcess]);

  if (err404) return Qalc404(err404, props.rerender);
  const universalActions = (
    <Action title="Execute" shortcut={{ modifiers: ["alt"], key: "enter" }} onAction={onExecute} />
  );
  const is_result_empty = searchText.trim() === "";
  const is_emptyview = is_result_empty && history.current.a.length === 0;
  return (
    <List
      isLoading={data.loading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Qalc anything..."
    >
      {is_emptyview ? (
        <List.EmptyView title="Start typing a calculation" />
      ) : (
        // !is_emptyview
        <>
          {is_result_empty ? (
            <></>
          ) : (
            // !is_result_empty
            <List.Section title={data.a[0]}>
              {data.a.length > 1 ? (
                data.a.slice(1).map((line, i) => (
                  <List.Item
                    title={line}
                    key={i}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="Copy"
                          content={line.slice(2)} // TODO better parse
                          shortcut={{ modifiers: ["cmd"], key: "." }}
                        />
                        {universalActions}
                      </ActionPanel>
                    }
                  />
                ))
              ) : (
                // data.a.length == 1 (no result)
                <List.Item
                  title="Execute to see the result"
                  key={-1}
                  actions={<ActionPanel>{universalActions}</ActionPanel>}
                />
              )}
            </List.Section>
          )}
          <List.Section title="History">
            {history.current.a.map(([expr, ans], i) => (
              <List.Item
                title={expr}
                accessories={[{ text: ans }]}
                key={i}
                actions={
                  <ActionPanel>
                    <Action title="Replace Input" onAction={() => setSearchText(expr)} />
                    {universalActions}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function Qalc404(err: [string, Error][], rerender: () => void) {
  return (
    <Detail
      markdown={`Hello!
---
I cannot find \`qalc\` on your machine. Please help!

If you have \`qalc\` installed, you can find it by running \`which qalc\`. Please copy that path into the settings.

You can get \`qalc\` from [https://qalculate.github.io/downloads.html](https://qalculate.github.io/downloads.html)  
or homebrew \`brew install libqalculate\`
 
---
Places checked:      _EACCES - permission denied (\`chmod +x\`), ENOENT - no such path_
${err.map(([place, e]) => "- " + place + "  \n" + e).join("\n")}
---
Press \`Enter\` to open settings or \`Alt\` \`Enter\` to try searching again.
`}
      actions={
        <ActionPanel>
          <Action title="Open Settings" onAction={openExtensionPreferences} />
          <Action title="Try Again!" shortcut={{ modifiers: ["alt"], key: "enter" }} onAction={rerender} />
        </ActionPanel>
      }
    />
  );
}
