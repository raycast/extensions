import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { pathToFileURL } from 'node:url';
import { parseRecipientFile } from '../src/file-import.js';
import {
  InputError,
  normalizeTanzanianPhone,
  parseBulkRecipients,
  parsePersonalizedMessages,
  requireSenderId,
  validateContent,
} from '../src/lib.js';

test('normalizes supported Tanzania numbers', () => {
  assert.equal(normalizeTanzanianPhone('255712345678'), '+255712345678');
  assert.equal(normalizeTanzanianPhone('+255713456789'), '+255713456789');
  assert.equal(normalizeTanzanianPhone('0712345678'), '+255712345678');
  assert.equal(normalizeTanzanianPhone('712345678'), '+255712345678');
});

test('rejects unsupported and duplicate recipients', () => {
  assert.throws(() => normalizeTanzanianPhone('254712345678'), InputError);
  assert.throws(
    () => parseBulkRecipients('255712345678, +255712345678'),
    InputError,
  );
});

test('requires a UUID sender ID', () => {
  assert.equal(
    requireSenderId('6addad95-f6c8-5929-8b5a-c8ef52067ea6'),
    '6addad95-f6c8-5929-8b5a-c8ef52067ea6',
  );
  assert.throws(() => requireSenderId('MYBRAND'), InputError);
  assert.equal(
    requireSenderId('6addad95-f6c8-0929-0b5a-c8ef52067ea6'),
    '6addad95-f6c8-0929-0b5a-c8ef52067ea6',
  );
});

test('parses personalized rows without losing message separators', () => {
  assert.deepEqual(parsePersonalizedMessages('255712345678 | Code | 482901'), [
    { recipient: '+255712345678', content: 'Code | 482901' },
  ]);
});

test('enforces a non-empty 918-character message limit', () => {
  assert.throws(() => validateContent('   '), InputError);
  assert.throws(() => validateContent('a'.repeat(919)), InputError);
  assert.equal(validateContent('Hello'), 'Hello');
});

test('reads the numbers header used by the contact sample CSV', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'notify-africa-sms-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'recipients.csv');
  await writeFile(
    file,
    'names,numbers\nAsha,255712345678\nBaraka,+255713456789\n',
  );

  assert.deepEqual(await parseRecipientFile(file), [
    '+255712345678',
    '+255713456789',
  ]);
});

test('reads a Raycast-style file URL and a suffixless cached CSV', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'notify-africa-sms-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const csv = join(directory, 'recipients.csv');
  const cachedCopy = join(directory, 'recipient-file');
  const content = 'numbers\n0712345678\n';
  await writeFile(csv, content);
  await writeFile(cachedCopy, content);

  assert.deepEqual(await parseRecipientFile(pathToFileURL(csv).href), [
    '+255712345678',
  ]);
  assert.deepEqual(await parseRecipientFile(cachedCopy), ['+255712345678']);
});

test('reads a headerless first column from the first XLSX worksheet', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'notify-africa-sms-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'recipients.xlsx');
  const cachedCopy = join(directory, 'recipient-file');
  const workbook = new ExcelJS.Workbook();
  const recipients = workbook.addWorksheet('Recipients');
  recipients.addRows([[712345678], [713456789]]);
  const ignored = workbook.addWorksheet('Ignored');
  ignored.addRow([255799999999]);
  await workbook.xlsx.writeFile(file);
  await workbook.xlsx.writeFile(cachedCopy);

  assert.deepEqual(await parseRecipientFile(file), [
    '+255712345678',
    '+255713456789',
  ]);
  assert.deepEqual(await parseRecipientFile(cachedCopy), [
    '+255712345678',
    '+255713456789',
  ]);
});

test('rejects an unrecognized header and duplicate imported recipients', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'notify-africa-sms-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const invalidHeaderFile = join(directory, 'invalid-header.csv');
  const duplicateFile = join(directory, 'duplicates.csv');
  await writeFile(invalidHeaderFile, 'Name,Number\nAsha,255712345678\n');
  await writeFile(duplicateFile, 'phone\n255712345678\n+255712345678\n');

  await assert.rejects(() => parseRecipientFile(invalidHeaderFile), InputError);
  await assert.rejects(() => parseRecipientFile(duplicateFile), InputError);
});

test('explains how to use an Apple Numbers document', async () => {
  await assert.rejects(
    () => parseRecipientFile('/tmp/contact-import.numbers'),
    /Export the file as CSV or XLSX/,
  );
});
