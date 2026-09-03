// Bundles the test suite (aliasing @raycast/api, which the lib imports for enums only)
// and runs it under node:test. Bundling rather than type-stripping keeps one code path
// for tests, the screenshot generator, and the extension itself.
import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, '.test-build');

mkdirSync(OUT, { recursive: true });
const stub = join(OUT, 'stub-raycast.js');
// getPreferenceValues throws outside a Raycast command context, which is exactly the
// condition config.ts guards against, so the stub reproduces that rather than faking
// a value the tests would never see in the real runtime.
writeFileSync(stub, [
  `const h={get:(_t,p)=>String(p)};`,
  `export const Color=new Proxy({},h);`,
  `export const Icon=new Proxy({},h);`,
  `export function getPreferenceValues(){throw new Error("no preferences outside Raycast");}`,
  `export const Action=new Proxy(function(){},h);`,
  `export const ActionPanel=new Proxy(function(){},h);`,
  `export const List=new Proxy(function(){},h);`,
  `export const Toast={Style:new Proxy({},h)};`,
  `export function showToast(){}`,
  `export const environment={appearance:'dark'};`,
  ``,
].join('\n'));

await build({
  entryPoints: [join(ROOT, 'tests', 'lib.test.ts'), join(ROOT, 'tests', 'editConfig.test.ts')],
  bundle: true, format: 'esm', platform: 'node', outdir: OUT,
  alias: { '@raycast/api': stub },
  external: ['node:*'],
  logLevel: 'error',
});

try {
  const files = ['lib.test.js', 'editConfig.test.js'].map((f) => join(OUT, f));
  const { stdout, stderr } = await exec(process.execPath, ['--test', ...files], { maxBuffer: 32 * 1024 * 1024 });
  process.stdout.write(stdout); process.stderr.write(stderr);
} catch (e) {
  process.stdout.write(e.stdout ?? ''); process.stderr.write(e.stderr ?? '');
  rmSync(OUT, { recursive: true, force: true });
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
