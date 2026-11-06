import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

// Bundle the application with host API doubles; React itself remains real.
// Generated test files stay beside node_modules so resolution works on Windows too.
test('React form and action regressions', async () => {
  const dir = await mkdtemp(path.resolve('.ui-tests-'));
  try {
    const outfile = path.join(dir, 'ui.cjs');
    await build({
      entryPoints: ['tests/ui-cases.tsx'],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
      alias: {
        '@raycast/api': path.resolve('tests/mocks/raycast.tsx'),
        '@raycast/utils': path.resolve('tests/mocks/utils.ts'),
      },
    });
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    execFileSync(process.execPath, ['--test', outfile], {
      stdio: 'inherit',
      env,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
