import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const build = process.env.DIGUP_TEST_CONFIGURE;
const require = createRequire(import.meta.url);

for (const commandName of ["search", "configure"]) {
  test(`saving folders from ${commandName} never launches itself`, { skip: !build }, async () => {
    const folders = { roots: ["/tmp/documents"], codeRoots: ["/tmp/code"], excludedFolders: [] };
    const state = [folders, false, undefined];
    const errors: unknown[] = [];
    const launches: { name: string; type: string }[] = [];
    let saved = ""; let popped = 0; let reloaded = 0;
    const Form = Object.assign(() => {}, { Description: () => {}, FilePicker: () => {} });
    const api = {
      environment: { commandName, assetsPath: "/tmp/assets", supportPath: "/tmp/support" },
      Form, Action: { SubmitForm: () => {} }, ActionPanel: () => {},
      LaunchType: { Background: "background", UserInitiated: "userInitiated" },
      useNavigation: () => ({ pop: () => { popped++; } }),
      LocalStorage: { setItem: async (_key: string, value: string) => { saved = value; } },
      launchCommand: async (options: { name: string; type: string }) => {
        if (options.name === commandName) throw new Error("Command cannot launch itself");
        launches.push(options);
      },
      showToast: async () => { throw new Error("Toast API is not available"); },
    };
    const react = { useRef: () => ({ current: null }), useEffect: () => {}, useState: () => [state.shift(), (value: unknown) => { errors.push(value); }] };
    const module = { exports: {} as { default: (props: { onSaved: () => void }) => { props: { actions: { props: { children: { props: { onSubmit: () => Promise<void> } } } } } } } };
    runInNewContext(`(function(require,module,exports){${readFileSync(build!, "utf8")}\n})`, { Error })
      ((id: string) => id === "@raycast/api" ? api : id === "react" ? react : require(id), module, module.exports);
    const view = module.exports.default({ onSaved: () => { reloaded++; } });
    const actions = view.props.actions.props.children as unknown as { props: { title: string; onSubmit: () => Promise<void> } }[];
    await actions.find(action => action.props.title === "Save and Index")!.props.onSubmit();
    assert.deepEqual(JSON.parse(saved), folders);
    assert.deepEqual(errors, []);
    assert.equal(launches[0].name, "index-files");
    assert.equal(launches[0].type, "userInitiated");
    assert.equal(popped, commandName === "search" ? 1 : 0);
    assert.equal(reloaded, commandName === "search" ? 1 : 0);
    assert.equal(launches.some((launch) => launch.name === "search"), false);
  });
}


for (const fails of [false, true]) {
 test(`ranking setup is explicit and shows ${fails ? "failure" : "completion"} in the folder form`, {skip: !build}, async t => {
  const root=mkdtempSync(join(tmpdir(),"lens-ranking-form-"));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const assets=join(root,"assets");mkdirSync(assets);
  writeFileSync(join(assets,"digup"),`#!/usr/bin/env node
console.log(JSON.stringify(${fails ? '{event:"error",message:"Download failed"}' : '{event:"done"}'}));
process.exitCode=${fails ? 1 : 0};
`,{mode:0o755});
  const component=()=>{};
  const api={environment:{commandName:"configure",assetsPath:assets,supportPath:root},
   Form:Object.assign(component,{Description:component,FilePicker:component}),
   Action:Object.assign(component,{SubmitForm:component}),ActionPanel:component,
   LaunchType:{UserInitiated:"userInitiated"},launchCommand:async()=>{throw new Error("must not launch");},
   LocalStorage:{getItem:async()=>undefined},useNavigation:()=>({pop:()=>{}})};
  const values:unknown[]=[{roots:[],codeRoots:[],excludedFolders:[]},false,undefined,undefined];
  let cursor=0;const ref={current:null};
  const react={useEffect:()=>{},useRef:()=>ref,useState:(initial:unknown)=>{const slot=cursor++;if(slot>=values.length)values[slot]=initial;return[values[slot],(value:unknown)=>{values[slot]=value;}];}};
  type View={props:{actions:{props:{children:{props:{title:string;onAction:()=>Promise<void>}}[]}};children:{props:{title?:string;text?:string}}[]}};
  const module={exports:{} as {default:()=>View}};
  runInNewContext(`(function(require,module,exports){${readFileSync(build!,"utf8")}\n})`,{Error,AbortController,process,Buffer,setTimeout,clearTimeout})
    ((id:string)=>id==="@raycast/api"?api:id==="react"?react:require(id),module,module.exports);
  const render=()=>{cursor=0;return module.exports.default();};
  const view=render();const marker=join(root,"models/reranker/enabled.json");assert.equal(existsSync(marker),false);
  const action=view.props.actions.props.children.find(x=>x.props.title.startsWith("Download Local Ranking"))!;
  const setup=action.props.onAction();await action.props.onAction();await setup;
  const status=render().props.children.find(x=>x.props.title==="Local Content Ranking")!.props.text;
  assert.match(status!,fails?/Setup failed: Download failed/:/Local ranking is ready/);
  assert.equal(existsSync(marker),!fails);assert.equal(values[1],false);
 });
}
