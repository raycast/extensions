// A React state/handler test with mocked host APIs, not Raycast integration proof.
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { strict as assert } from 'node:assert';
import { test, beforeEach, afterEach, mock } from 'node:test';
import fs from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import CreateGradient from '../src/create-gradient';
import PreviewGradient from '../src/gradient-preview';
import SavedGradients from '../src/saved-gradients';
import RandomGradient from '../src/random-gradient';
import LabelForm from '../src/components/label-form';
import ExportForm from '../src/components/export-form';
import { state, reset } from './mocks/raycast';
import { PNG } from 'pngjs';
import { generatePng } from '../src/lib/grad';
import { Gradient } from '../src/types';
import { usePreviewImage } from '../src/lib/use-preview-image';
import { library } from '../src/lib/use-library';
import { entryRef } from '../src/lib/library';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let view: ReactTestRenderer;
async function render(element: React.ReactElement) {
  reset();
  await act(async () => {
    view = create(element);
  });
}
const host = (name: string) => view.root.findAll((node) => node.type === name);
const field = (id: string) =>
  host('TextField').find((node) => node.props.id === id)!;
const tempVariable = process.platform === 'win32' ? 'TEMP' : 'TMPDIR';
const originalTemp = process.env[tempVariable];
let testDirectory: string;
beforeEach(async () => {
  testDirectory = await mkdtemp(path.join(tmpdir(), 'gradient-preview-test-'));
  process.env[tempVariable] = testDirectory;
});
async function change(id: string, value: string) {
  await act(async () => field(id).props.onChange(value));
}
async function submit() {
  await act(async () => host('SubmitForm')[0].props.onSubmit());
}
afterEach(async () => {
  if (view) await act(async () => view.unmount());
  if (originalTemp === undefined) delete process.env[tempVariable];
  else process.env[tempVariable] = originalTemp;
  await rm(testDirectory, { recursive: true, force: true });
});
const gradient = {
  type: 'linear' as const,
  angle: 90,
  stops: ['#000', '#FFF'],
  label: 'Hero',
};

test('Create marks specific invalid fields, retains inputs and sends the label to Preview', async () => {
  await render(<CreateGradient />);
  await change('label', 'Hero');
  await change('color-0', 'invalid');
  await submit();
  assert.match(field('color-0').props.error, /Enter a color/);
  assert.equal(field('color-1').props.error, undefined);
  assert.equal(state.pushes.length, 0);
  await change('color-0', '#ABC');
  await submit();
  assert.equal((state.pushes[0].props as { label: string }).label, 'Hero');
});

test('label form stays open after cancellation or write failure, closes only on success', async () => {
  let outcome: 'cancel' | 'fail' | 'save' = 'cancel';
  await render(
    <LabelForm
      initialLabel="Hero"
      onSubmit={async () => {
        if (outcome === 'fail') throw Error('disk full');
        return outcome === 'save';
      }}
    />,
  );
  await change('label', 'New');
  await submit();
  assert.equal(state.pops, 0);
  assert.equal(field('label').props.value, 'New');
  outcome = 'fail';
  await submit();
  assert.equal(state.pops, 0);
  assert.equal(host('Form')[0].props.isLoading, false);
  outcome = 'save';
  await submit();
  assert.equal(state.pops, 1);
});

test('Preview can save repeatedly without duplicating unlabeled entries', async () => {
  await render(<PreviewGradient {...gradient} label={undefined} />);
  const save = () =>
    host('Action')
      .find((n) =>
        /^(Save Gradient|Update Saved Gradient)$/.test(n.props.title),
      )!
      .props.onAction();
  await act(save);
  await act(save);
  assert.equal(JSON.parse(state.raw!).length, 1);
});

test('Preview preserves established primary actions without duplicate shortcuts', async () => {
  for (const random of [false, true]) {
    await render(
      <PreviewGradient
        {...gradient}
        isRandomGradient={random}
        onGenerateRandom={() => gradient}
      />,
    );
    if (random)
      assert.equal(host('Detail')[0].props.navigationTitle, undefined);
    const actions = view.root.findAll((node) =>
      ['Action', 'Push', 'CopyToClipboard', 'Paste'].includes(
        String(node.type),
      ),
    );
    assert.deepEqual(
      actions.slice(0, 2).map((node) => node.props.title),
      random
        ? ['Random (Any)', 'Random (2 Stops)']
        : ['Add Color Stop', 'Save Gradient'],
    );
    const shortcuts = actions.flatMap((node) =>
      node.props.shortcut ? [JSON.stringify(node.props.shortcut.macOS)] : [],
    );
    assert.equal(new Set(shortcuts).size, shortcuts.length);
    await act(async () => view.unmount());
  }
});

test('pending saves guard preview changes and release the actions afterwards', async (context) => {
  for (const random of [false, true]) {
    let finish!: () => void;
    const saving = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const save = context.mock.method(
      library,
      'save',
      async (value: Gradient) => {
        await saving;
        return entryRef(value, 0);
      },
    );
    await render(
      <PreviewGradient
        {...gradient}
        isRandomGradient={random}
        onGenerateRandom={() => ({ type: 'conic', stops: ['#F00', '#00F'] })}
      />,
    );
    const before = host('Detail')[0].props.markdown;
    let pending!: Promise<void>;
    await act(async () => {
      pending = host('Action')
        .find((n) => n.props.title === 'Save Gradient')!
        .props.onAction();
    });
    const changePreview = () =>
      host('Action')
        .find(
          (n) => n.props.title === (random ? 'Random (Any)' : 'Add Color Stop'),
        )!
        .props.onAction();
    try {
      await act(changePreview);
      assert.equal(host('Detail')[0].props.markdown, before);
    } finally {
      await act(async () => {
        finish();
        await pending;
      });
      save.mock.restore();
    }
    assert.equal(host('Detail')[0].props.isLoading, false);
    await act(changePreview);
    assert.notEqual(host('Detail')[0].props.markdown, before);
    await act(async () => view.unmount());
  }
});

test('Saved list and Preview honour raw CSS preference', async () => {
  reset();
  state.raw = JSON.stringify([gradient]);
  state.preferences = { tailwindOutputMode: 'css' };
  await act(async () => {
    view = create(<SavedGradients />);
  });
  let copies = host('CopyToClipboard');
  assert.equal(
    copies.find((n) => n.props.title === 'Copy Tailwind')!.props.content,
    copies.find((n) => n.props.title === 'Copy CSS')!.props.content,
  );
  await act(async () => view.update(<PreviewGradient {...gradient} />));
  copies = host('CopyToClipboard');
  assert.equal(
    copies.find((n) => n.props.title === 'Copy Tailwind')!.props.content,
    copies.find((n) => n.props.title === 'Copy CSS')!.props.content,
  );
});

test('export failure retains values and resets busy; valid retry produces the requested pixels', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-ui-'));
  try {
    await render(
      <ExportForm
        gradient={gradient}
        format="png"
        directory={path.join(directory, 'missing')}
      />,
    );
    await change('width', '7');
    await change('height', '3');
    await change('filename', 'custom.png');
    await submit();
    assert.equal(state.pops, 0);
    assert.equal(field('filename').props.value, 'custom.png');
    assert.equal(host('Form')[0].props.isLoading, false);
    assert.equal(state.toasts.at(-1)!.style, 'failure');
    await act(async () =>
      view.update(
        <ExportForm gradient={gradient} format="png" directory={directory} />,
      ),
    );
    await submit();
    assert.equal(state.pops, 1);
    assert.equal(state.toasts.at(-1)!.style, 'success');
    const png = PNG.sync.read(
      await readFile(path.join(directory, 'custom.png')),
    );
    assert.equal(png.width, 7);
    assert.equal(png.height, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('export rejects partial integers and traversal inline; overwrite cancellation stays open', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-ui-'));
  try {
    await render(
      <ExportForm gradient={gradient} format="svg" directory={directory} />,
    );
    await change('width', '12px');
    await change('filename', '../gradient.svg');
    await submit();
    assert.ok(field('width').props.error);
    assert.ok(field('filename').props.error);
    assert.equal(state.pops, 0);
    await change('width', '12');
    await change('filename', 'existing.svg');
    await writeFile(path.join(directory, 'existing.svg'), 'original');
    await submit();
    assert.equal(state.confirmations, 1);
    assert.equal(state.pops, 0);
    assert.equal(host('Form')[0].props.isLoading, false);
    assert.equal(
      await readFile(path.join(directory, 'existing.svg'), 'utf8'),
      'original',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('duplicate label submissions execute only one pending save', async () => {
  let calls = 0;
  let release!: (value: boolean) => void;
  await render(
    <LabelForm
      onSubmit={async () => {
        calls++;
        return new Promise((resolve) => {
          release = resolve;
        });
      }}
    />,
  );
  await act(async () => {
    const first = host('SubmitForm')[0].props.onSubmit();
    await host('SubmitForm')[0].props.onSubmit();
    assert.equal(calls, 1);
    release(true);
    await first;
  });
  assert.equal(state.pops, 1);
});

test('Create and Preview enforce the same stop limit', async () => {
  await render(<CreateGradient />);
  for (let i = 0; i < 15; i++)
    await act(async () =>
      host('Action')
        .find((n) => n.props.title === 'Add Color Stop')!
        .props.onAction(),
    );
  assert.equal(
    host('TextField').filter((n) => n.props.id.startsWith('color-')).length,
    10,
  );
  await submit();
  await act(async () => view.update(state.pushes[0]));
  assert.equal(
    host('Action').filter((n) => n.props.title === 'Add Color Stop').length,
    0,
  );
});

test('Preview and Saved list use the same collision confirmation and retain data on cancellation', async () => {
  await render(<PreviewGradient {...gradient} />);
  state.raw = JSON.stringify([{ ...gradient, stops: ['#F00', '#00F'] }]);
  await act(async () =>
    host('Action')
      .find((n) => n.props.title === 'Save Gradient')!
      .props.onAction(),
  );
  assert.equal(state.confirmations, 1);
  assert.deepEqual(JSON.parse(state.raw)[0].stops, ['#F00', '#00F']);
  assert.equal(state.toasts.filter((t) => t.style === 'success').length, 0);
});

test('Random command regenerates state and respects explicit two/three-stop actions', async (context) => {
  let counter = 0;
  context.mock.method(Math, 'random', () => (++counter % 97) / 97);
  await render(<RandomGradient />);
  const before = host('Detail')[0].props.markdown;
  await act(async () =>
    host('Action')
      .find((n) => n.props.title === 'Random (3 Stops)')!
      .props.onAction(),
  );
  assert.notEqual(host('Detail')[0].props.markdown, before);
  assert.equal(host('Tag').length, 3);
  await act(async () =>
    host('Action')
      .find((n) => n.props.title === 'Random (2 Stops)')!
      .props.onAction(),
  );
  assert.equal(host('Tag').length, 2);
});

test('duplicate export submissions create only one export and one success', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-ui-'));
  try {
    await render(
      <ExportForm gradient={gradient} format="png" directory={directory} />,
    );
    await act(async () => {
      const submit = host('SubmitForm')[0].props.onSubmit;
      const first = submit();
      await submit();
      await first;
    });
    assert.equal(state.pops, 1);
    assert.equal(
      state.toasts.filter((toast) => toast.style === 'success').length,
      1,
    );
    assert.equal(state.confirmations, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Preview sends a bounded local image reference through repeated type and stop changes', async () => {
  const { fileURLToPath } = await import('node:url');
  const { access } = await import('node:fs/promises');
  let next: Gradient = { ...gradient };
  await render(
    <React.StrictMode>
      <PreviewGradient
        {...gradient}
        isRandomGradient
        onGenerateRandom={() => next}
      />
    </React.StrictMode>,
  );
  const published = new Set<string>();
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const type of ['linear', 'radial', 'conic'] as const) {
      for (const count of [2, 3] as const) {
        next = {
          type,
          angle: 37 + repeat,
          stops: ['#123456', '#FEDCBA', '#38A4D9'].slice(0, count),
          label: 'Hero',
        };
        await act(async () =>
          host('Action')
            .find((n) => n.props.title === `Random (${count} Stops)`)!
            .props.onAction(),
        );
        const markdown: string = host('Detail')[0].props.markdown;
        assert.doesNotMatch(markdown, /data:image/);
        assert.ok(
          markdown.length < 4096,
          'PNG bytes must not cross the Markdown bridge',
        );
        const url = markdown.match(/!\[[^\]]*\]\(<(file:[^>]+)>\)/)?.[1];
        assert.ok(url, 'Preview must reference a local PNG');
        const file = fileURLToPath(url);
        const bytes = await readFile(file);
        const image = PNG.sync.read(bytes);
        assert.equal(image.width, 800);
        assert.equal(image.height, 480);
        assert.deepEqual(
          image.data,
          PNG.sync.read(generatePng(next, 800, 480)).data,
        );
        assert.ok(
          !published.has(file),
          'Each published image has a unique URL',
        );
        published.add(file);
        for (const previous of published) await access(previous);
      }
    }
  }
  await act(async () => view.unmount());
  // A native reader can still hold a previously published URL after React cleanup.
  for (const file of published)
    assert.equal(PNG.sync.read(await readFile(file)).width, 800);
});

test('failed preview generation removes unpublished files and recovers on the next gradient', async () => {
  let image: ReturnType<typeof usePreviewImage>;
  function Probe({ value }: { value: Gradient }) {
    image = usePreviewImage(value);
    return null;
  }
  const write = fs.writeFileSync;
  const failure = mock.method(
    fs,
    'writeFileSync',
    (...args: Parameters<typeof write>) => {
      write(...args);
      throw new Error('Simulated failure after a partial write');
    },
  );
  try {
    await render(<Probe value={gradient} />);
  } finally {
    failure.mock.restore();
  }
  assert.ok(image?.error);
  assert.equal(image?.url, undefined);
  assert.deepEqual(await readdir(testDirectory), []);
  await act(async () => view.update(<Probe value={{ ...gradient }} />));
  assert.ok(image?.url);
  assert.equal(image?.error, undefined);
});

test('saving a label retains the existing preview file and copied outputs', async () => {
  await render(<PreviewGradient {...gradient} />);
  const before = host('Detail')[0].props.markdown;
  const label = host('Push').find((n) => n.props.title === 'Save with Label')!;
  await act(async () => label.props.target.props.onSubmit('New label'));
  assert.equal(host('Detail')[0].props.navigationTitle, 'New label');
  assert.equal(host('Detail')[0].props.markdown, before);
  assert.equal(JSON.parse(state.raw!)[0].label, 'New label');
});

test('preview file failure is visible, stops loading and leaves copy actions available', async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'gradient-missing-temp-'),
  );
  const variable = process.platform === 'win32' ? 'TEMP' : 'TMPDIR';
  const original = process.env[variable];
  try {
    process.env[variable] = path.join(directory, 'missing');
    await render(<PreviewGradient {...gradient} />);
    assert.match(
      host('Detail')[0].props.markdown,
      /Preview could not be rendered/,
    );
    assert.match(host('Detail')[0].props.markdown, /ENOENT/);
    assert.equal(host('Detail')[0].props.isLoading, false);
    assert.match(
      host('CopyToClipboard').find((n) => n.props.title === 'Copy CSS')!.props
        .content,
      /linear-gradient/,
    );
  } finally {
    if (original === undefined) delete process.env[variable];
    else process.env[variable] = original;
    await rm(directory, { recursive: true, force: true });
  }
});
