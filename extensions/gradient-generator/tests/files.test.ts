import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import {
  exportDirectory,
  exportFile,
  validateFilename,
} from '../src/lib/files';

test('portable filenames reject traversal, control characters and Windows device names', () => {
  for (const name of [
    '',
    '../x.png',
    '..\\x.png',
    '/x.png',
    'C:\\x.png',
    'x:foo.png',
    'x\u0000.png',
    'NUL.png',
    'COM1.png',
    'LPT¹.png',
    'x.png ',
    'x.png.',
    'x.svg',
    '.png',
    'a'.repeat(241) + '.png',
  ])
    assert.throws(() => validateFilename(name, 'png'), name);
  assert.equal(
    validateFilename('Brand accent 2.PNG', 'png'),
    'Brand accent 2.PNG',
  );
  assert.equal(
    exportDirectory('~/Downloads'),
    path.join(homedir(), 'Downloads'),
  );
  assert.equal(exportDirectory(), path.join(homedir(), 'Downloads'));
  assert.throws(() => exportDirectory('relative'));
});

test('export writes successfully; cancellation, generation failure and replacement are explicit', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-test-'));
  try {
    const options = {
      directory,
      filename: 'test.png',
      extension: 'png' as const,
      generate: async () => Buffer.from('first'),
      confirmOverwrite: async () => false,
    };
    assert.equal(await exportFile(options), true);
    const target = path.join(directory, 'test.png');
    assert.equal(
      await exportFile({
        ...options,
        generate: async () => {
          throw Error('must not generate on cancel');
        },
      }),
      false,
    );
    await assert.rejects(
      exportFile({
        ...options,
        confirmOverwrite: async () => true,
        generate: async () => {
          throw Error('render failed');
        },
      }),
      /render failed/,
    );
    assert.equal(await readFile(target, 'utf8'), 'first');
    assert.equal(
      await exportFile({
        ...options,
        confirmOverwrite: async () => true,
        generate: async () => 'second',
      }),
      true,
    );
    assert.equal(await readFile(target, 'utf8'), 'second');
    assert.deepEqual(await readdir(directory), ['test.png']);
    await assert.rejects(
      exportFile({ ...options, directory: path.join(directory, 'missing') }),
    );
    await assert.rejects(exportFile({ ...options, directory: target }));
    await symlink(target, path.join(directory, 'alias.png'));
    await assert.rejects(
      exportFile({
        ...options,
        filename: 'alias.png',
        confirmOverwrite: async () => true,
      }),
      /regular file/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('destination races preserve competing files and clean temporary data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-test-'));
  try {
    const target = path.join(directory, 'race.png');
    await assert.rejects(
      exportFile({
        directory,
        filename: 'race.png',
        extension: 'png',
        confirmOverwrite: async () => true,
        generate: async () => {
          await writeFile(target, 'other');
          return 'ours';
        },
      }),
      /changed/,
    );
    assert.equal(await readFile(target, 'utf8'), 'other');
    assert.deepEqual(await readdir(directory), ['race.png']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test(
  'unwritable destination fails without changing an existing file',
  { skip: process.platform === 'win32' || process.getuid?.() === 0 },
  async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'gradient-permission-'),
    );
    try {
      const target = path.join(directory, 'kept.png');
      await writeFile(target, 'original');
      await chmod(directory, 0o500);
      await assert.rejects(
        exportFile({
          directory,
          filename: 'kept.png',
          extension: 'png',
          generate: async () => 'replacement',
          confirmOverwrite: async () => true,
        }),
        (error: NodeJS.ErrnoException) =>
          error.code === 'EACCES' || error.code === 'EPERM',
      );
      assert.equal(await readFile(target, 'utf8'), 'original');
    } finally {
      await chmod(directory, 0o700);
      await rm(directory, { recursive: true, force: true });
    }
  },
);
