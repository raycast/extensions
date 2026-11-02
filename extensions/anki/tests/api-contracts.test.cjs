const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

test('Anki actions enforce their own parameter and result types', () => {
  const root = path.resolve(__dirname, '..');
  const filename = path.join(root, 'src/api/__contract-check.ts');
  const source = `
    import { ankiReq } from './ankiClient';
    const media: Promise<string> = ankiReq('getMediaDirPath');
    const due: Promise<boolean[]> = ankiReq('areDue', { cards: [1] });
    // @ts-expect-error cardsInfo requires card IDs.
    ankiReq('cardsInfo');
    // @ts-expect-error areDue accepts cards, not notes.
    ankiReq('areDue', { notes: [1] });
    // @ts-expect-error deck stats require names, not a name-to-ID map.
    ankiReq('getDeckStats', { decks: { Default: 1 } });
    // @ts-expect-error callers cannot select an unrelated result type.
    const wrong: Promise<string[]> = ankiReq('areDue', { cards: [1] });
    // @ts-expect-error updates must include fields or tags.
    ankiReq('updateNote', { note: { id: 1 } });
  `;
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const options = { ...parsed.options, noEmit: true };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (file, languageVersion, ...args) =>
    file === filename
      ? ts.createSourceFile(file, source, languageVersion, true)
      : original(file, languageVersion, ...args);
  const program = ts.createProgram([filename, path.join(root, 'raycast-env.d.ts')], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(
    diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
    []
  );
});
