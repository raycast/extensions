/**
 * Developer tool: compares JXA vs SQL output for every list.
 * Run from Raycast as "Compare JXA vs SQL (Dev)".
 * Results are written to ~/Desktop/things-compare.txt and opened in TextEdit.
 */

import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { showToast, Toast, getPreferenceValues } from '@raycast/api';
import { getListTodosFromDB } from './api-sql';
import { getListTodosViaJXA } from './api-jxa';
import { CommandListName, Todo } from './types';

const execAsync = promisify(exec);

const LIST_NAMES: CommandListName[] = ['inbox', 'today', 'anytime', 'upcoming', 'someday', 'trash'];

export default async function Command() {
  const { thingsAppIdentifier } = getPreferenceValues<Preferences>();

  await showToast({ style: Toast.Style.Animated, title: 'Running JXA vs SQL comparison…' });

  const lines: string[] = [];
  const log = (...args: unknown[]) => lines.push(args.map(String).join(' '));

  let totalLists = 0;
  let listsWithDiffs = 0;

  for (const list of LIST_NAMES) {
    log('');
    log('='.repeat(60));
    log(`LIST: ${list.toUpperCase()}`);
    log('='.repeat(60));

    let jxaItems: Todo[] = [];
    let sqlItems: Todo[] = [];
    let jxaError: string | null = null;
    let sqlError: string | null = null;

    try {
      jxaItems = await getListTodosViaJXA(thingsAppIdentifier, list);
    } catch (e) {
      jxaError = e instanceof Error ? e.message : String(e);
    }

    try {
      sqlItems = await getListTodosFromDB(list);
    } catch (e) {
      sqlError = e instanceof Error ? e.message : String(e);
    }

    if (jxaError) log(`  JXA ERROR: ${jxaError}`);
    if (sqlError) log(`  SQL ERROR: ${sqlError}`);

    if (jxaError || sqlError) {
      listsWithDiffs++;
      totalLists++;
      continue;
    }

    log(`  JXA count: ${jxaItems.length}   SQL count: ${sqlItems.length}`);

    let listHasDiff = false;

    if (jxaItems.length !== sqlItems.length) {
      log(`  !! COUNT MISMATCH`);
      listHasDiff = true;
    }

    // Compare order (by id)
    const jxaIds = jxaItems.map((t) => t.id);
    const sqlIds = sqlItems.map((t) => t.id);
    const orderMatch = JSON.stringify(jxaIds) === JSON.stringify(sqlIds);
    if (!orderMatch) {
      log(`  !! ORDER MISMATCH`);
      log(`     JXA: ${jxaIds.join(', ')}`);
      log(`     SQL: ${sqlIds.join(', ')}`);
      listHasDiff = true;
    } else {
      log(`  OK Order matches`);
    }

    // Items only in JXA
    const sqlMap = new Map(sqlItems.map((t) => [t.id, t]));
    const jxaMap = new Map(jxaItems.map((t) => [t.id, t]));
    for (const id of jxaIds) {
      if (!sqlMap.has(id)) {
        log(`  !! JXA-only item: ${id} "${jxaMap.get(id)?.name}"`);
        listHasDiff = true;
      }
    }

    // Items only in SQL
    for (const id of sqlIds) {
      if (!jxaMap.has(id)) {
        log(`  !! SQL-only item: ${id} "${sqlMap.get(id)?.name}"`);
        listHasDiff = true;
      }
    }

    if (!listHasDiff) {
      log(`  OK All ${jxaItems.length} items match`);
    }

    if (listHasDiff) listsWithDiffs++;
    totalLists++;
  }

  log('');
  log('='.repeat(60));
  log(`SUMMARY: ${listsWithDiffs}/${totalLists} lists have differences`);
  log('='.repeat(60));

  // Write to file and open
  const outPath = join(homedir(), 'Desktop', 'things-compare.txt');
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  await execAsync(`open "${outPath}"`);

  await showToast({
    style: listsWithDiffs === 0 ? Toast.Style.Success : Toast.Style.Failure,
    title: listsWithDiffs === 0 ? 'JXA = SQL on all lists' : `${listsWithDiffs} list(s) have differences`,
    message: `Opened things-compare.txt on Desktop`,
  });
}
