require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, delimiter, resolve } = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { resolveCliExecutable, runCli } = require('../src/cli-executable.ts');
const exec = promisify(execFile);

function npmFixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'raycast-npm-shim-'));
  const appData = join(dir, 'App Data');
  const npm = join(appData, 'npm');
  const entry = join(npm, 'node_modules', '@qodercn-ai', 'qoderclicn', 'bundle', 'qoderclicn.js');
  mkdirSync(dirname(entry), { recursive: true });
  writeFileSync(entry, 'console.log(JSON.stringify({entry:__filename,args:process.argv.slice(2)}));');
  const shim = join(npm, 'qoderclicn');
  const cmd = `${shim}.cmd`;
  // These intentionally fail if launched. Only the known JS package entry is valid.
  writeFileSync(shim, '#!/bin/sh\nexit 97\n', { mode: 0o700 });
  writeFileSync(cmd, '@exit /b 97\r\n');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, appData, npm, entry, shim, cmd };
}

test('known npm .cmd wrapper resolves to Node entrypoint and preserves literal argv', async t => {
  const f = npmFixture(t);
  const executable = await resolveCliExecutable('qoder-cn', f.cmd);
  assert.deepEqual(
    executable.prefix.map((value) => realpathSync(value)),
    [realpathSync(f.entry)],
  );
  assert.notEqual(executable.command, f.cmd);
  assert.equal(/(?:cmd|powershell|pwsh)(?:\.exe)?$/i.test(executable.command), false);
  const prompt = '--literal $(echo must-not-run) & "quotes"\nsecond line';
  const result = JSON.parse(await runCli(executable, [prompt]));
  assert.equal(realpathSync(result.entry), realpathSync(f.entry));
  assert.deepEqual(result.args, [prompt]);
});

test('Windows extensionless npm shim resolves to its known package entrypoint', { skip: process.platform !== 'win32' }, async t => {
  const f = npmFixture(t);
  const executable = await resolveCliExecutable('qoder-cn', f.shim);
  assert.deepEqual(executable.prefix, [f.entry]);
  assert.notEqual(executable.command, f.shim);
  const result = JSON.parse(await runCli(executable, ['safe-test']));
  assert.deepEqual(result.args, ['safe-test']);
});

test('Windows auto discovery handles extensionless npm result with isolated child APPDATA and PATH', { skip: process.platform !== 'win32', timeout: 15000 }, async t => {
  const f = npmFixture(t);
  const source = `require(${JSON.stringify(resolve(__dirname, 'load.cjs'))});
const {resolveCliExecutable,runCli}=require(${JSON.stringify(resolve(__dirname, '../src/cli-executable.ts'))});
(async()=>{const x=await resolveCliExecutable('qoder-cn');const result=JSON.parse(await runCli(x,['literal & $()']));console.log(JSON.stringify({command:x.command,prefix:x.prefix,result}));})().catch(e=>{console.error(e.message);process.exitCode=1;});`;
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (['path', 'appdata'].includes(key.toLowerCase())) delete env[key];
  env.APPDATA = f.appData;
  env.PATH = [f.npm, dirname(process.execPath), join(process.env.SystemRoot || 'C:/Windows', 'System32')].join(delimiter);
  const { stdout } = await exec(process.execPath, ['-e', source], { cwd: f.dir, env, timeout: 12000, windowsHide: true });
  const result = JSON.parse(stdout);
  assert.deepEqual(result.prefix, [f.entry]);
  assert.equal(/(?:cmd|powershell|pwsh)(?:\.exe)?$/i.test(result.command), false);
  assert.deepEqual(result.result.args, ['literal & $()']);
});

test('unrecognized shell wrapper is rejected instead of executing a prompt through a shell', async t => {
  const f = npmFixture(t);
  const wrapper = join(f.dir, 'unrecognized.cmd');
  writeFileSync(wrapper, '@exit /b 97\r\n');
  await assert.rejects(resolveCliExecutable('qoder-cn', wrapper), /not found/);
});
