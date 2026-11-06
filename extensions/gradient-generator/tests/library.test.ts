import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createLibrary, entryRef, parseLibrary } from '../src/lib/library';
import { Gradient } from '../src/types';
import { toCss, generatePng } from '../src/lib/grad';
const a: Gradient = { type: 'linear', stops: ['#abc', '#def'], label: 'A' };
const b: Gradient = { type: 'radial', stops: ['#000', '#fff'], label: 'B' };
function fixture(initial: string | undefined = JSON.stringify([a, b])) {
  let raw = initial,
    writes = 0;
  const library = createLibrary({
    get: async () => raw,
    set: async (value) => {
      writes++;
      raw = value;
    },
  });
  return {
    library,
    raw: () => raw,
    writes: () => writes,
    external: (value: string) => {
      raw = value;
    },
  };
}

test('legacy library reads without migration or writes, including duplicate content and optional labels', async () => {
  const values = [a, { ...a, label: undefined }, a];
  const f = fixture(JSON.stringify(values));
  assert.deepEqual(await f.library.read(), JSON.parse(JSON.stringify(values)));
  assert.equal(f.writes(), 0);
  assert.equal(f.raw(), JSON.stringify(values));
  assert.deepEqual(parseLibrary(undefined), []);
});

test('invalid persisted data is never silently discarded or overwritten', async () => {
  for (const raw of [
    'bad json',
    '{}',
    'null',
    '[null]',
    JSON.stringify([{ ...a, stops: ['no', '#fff'] }]),
    JSON.stringify([{ ...a, angle: null }]),
  ]) {
    const f = fixture(raw);
    await assert.rejects(f.library.read());
    await assert.rejects(f.library.save(b, async () => true));
    assert.equal(f.raw(), raw);
    assert.equal(f.writes(), 0);
  }
});

test('rename cancellation retains both entries; confirmed collision replaces the target', async () => {
  const f = fixture();
  assert.equal(
    await f.library.save(
      { ...a, label: ' B ' },
      async () => false,
      entryRef(a, 0),
    ),
    false,
  );
  assert.deepEqual(await f.library.read(), [a, b]);
  assert.equal(f.writes(), 0);
  assert.equal(
    Boolean(
      await f.library.save(
        { ...a, label: ' B ' },
        async () => true,
        entryRef(a, 0),
      ),
    ),
    true,
  );
  assert.deepEqual(await f.library.read(), [
    { ...a, label: 'B', stops: ['#ABC', '#DEF'] },
  ]);
});

test('clear label is explicit, duplicate content targets the selected entry only', async () => {
  const f = fixture(JSON.stringify([a, a]));
  await f.library.save(
    { ...a, label: '' },
    async () => {
      throw Error('unlabeled collision');
    },
    entryRef(a, 1),
  );
  const values = await f.library.read();
  assert.equal(values[0].label, 'A');
  assert.equal(values[1].label, undefined);
});

test('writes read the latest state and serialize concurrent saves', async () => {
  const f = fixture(undefined);
  await Promise.all([
    f.library.save(a, async () => true),
    f.library.save(b, async () => true),
  ]);
  assert.equal((await f.library.read()).length, 2);
});

test('stale indices and changes during confirmation fail without writing', async () => {
  const f = fixture();
  await f.library.remove(entryRef(a, 0));
  await assert.rejects(
    f.library.save({ ...b, label: 'C' }, async () => true, entryRef(b, 1)),
    /changed/,
  );
  assert.deepEqual(await f.library.read(), [b]);
  const g = fixture();
  await assert.rejects(
    g.library.save(
      { ...a, label: 'B' },
      async () => {
        g.external(JSON.stringify([b]));
        return true;
      },
      entryRef(a, 0),
    ),
    /changed/,
  );
  assert.equal(g.writes(), 0);
  assert.deepEqual(await g.library.read(), [b]);
});

test('a failed write does not poison the queue', async () => {
  let fail = true,
    raw: string | undefined;
  const library = createLibrary({
    get: async () => raw,
    set: async (value) => {
      if (fail) throw Error('disk full');
      raw = value;
    },
  });
  await assert.rejects(
    library.save(a, async () => true),
    /disk full/,
  );
  fail = false;
  assert.ok(await library.save(b, async () => true));
  assert.equal((await library.read())[0].label, 'B');
});

test('legacy gradients above the editing limit remain readable, exportable and renameable', async () => {
  const legacy = {
    ...a,
    stops: Array.from({ length: 12 }, (_, i) => (i % 2 ? '#ABC' : '#DEF')),
  };
  const f = fixture(JSON.stringify([legacy]));
  assert.deepEqual(await f.library.read(), [legacy]);
  assert.match(toCss(legacy), /linear-gradient/);
  assert.ok(generatePng(legacy, 2, 2).length > 0);
  await f.library.save(
    { ...legacy, label: 'Legacy' },
    async () => true,
    entryRef(legacy, 0),
  );
  assert.equal((await f.library.read())[0].stops.length, 12);
  await assert.rejects(
    f.library.save(legacy, async () => true),
    /color stops/,
  );
});
