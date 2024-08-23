import { Clipboard } from '@raycast/api';
import { getPreferenceValues, showHUD, showToast, Toast } from '@raycast/api';

import { format } from 'sql-formatter';

export default async () => {
  const output = formatSQL((await Clipboard.readText()) || '');
  if (output) {
    await copyFormattedSQL(output);
  }
};

// format sql
export function formatSQL(text: string) {
  const trimmedText = text.trim();
  let output = '';
  try {
    if (!validateSQL(trimmedText)) {
      showToastMessage();
      return;
    }

    const tabWidth = getTabWidth();
    const keywordCase = getKeywordCase();
    const options = {
      tabWidth: tabWidth === 'tab' ? 8 : parseInt(tabWidth),
      keywordCase: keywordCase,
    };

    output = format(trimmedText, options);
  } catch (error) {
    showToastMessage();
    return;
  }
  return output;
}

// copy or auto paste output
export async function copyFormattedSQL(result: string) {
  if (autoPasteEnabled()) {
    await Clipboard.paste(result);
    await showHUD('✅ Pasted succesfully!');
  } else {
    await Clipboard.copy(result);
    await showHUD('✅ Copied succesfully!');
  }
}

// user preferences settings
interface Preferences {
  tabWidth: tabWidthType;
  keywordCase: keywordCaseType;
  autopaste: boolean;
}

type tabWidthType = '2' | '4' | 'tab';
type keywordCaseType = 'preserve' | 'upper' | 'lower';

function getKeywordCase(): keywordCaseType {
  const { keywordCase } = getPreferenceValues<Preferences>();
  return keywordCase;
}

function getTabWidth(): tabWidthType {
  const { tabWidth } = getPreferenceValues<Preferences>();
  return tabWidth;
}

function autoPasteEnabled(): boolean {
  const { autopaste } = getPreferenceValues<Preferences>();
  return autopaste;
}

// sql keywords set
const sqlKeywords = new Set([
  'ADD',
  'ADD CONSTRAINT',
  'ALL',
  'ALTER',
  'ALTER COLUMN',
  'ALTER TABLE',
  'AND',
  'ANY',
  'AS',
  'ASC',
  'BACKUP DATABASE',
  'BETWEEN',
  'CASE',
  'CHECK',
  'COLUMN',
  'CONSTRAINT',
  'CREATE',
  'CREATE DATABASE',
  'CREATE INDEX',
  'CREATE OR REPLACE VIEW',
  'CREATE TABLE',
  'CREATE PROCEDURE',
  'CREATE UNIQUE INDEX',
  'CREATE VIEW',
  'DATABASE',
  'DEFAULT',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'DROP COLUMN',
  'DROP CONSTRAINT',
  'DROP DATABASE',
  'DROP DEFAULT',
  'DROP INDEX',
  'DROP TABLE',
  'DROP VIEW',
  'EXEC',
  'EXISTS',
  'FOREIGN KEY',
  'FROM',
  'FULL OUTER JOIN',
  'GROUP BY',
  'HAVING',
  'IN',
  'INDEX',
  'INNER JOIN',
  'INSERT INTO',
  'INSERT INTO SELECT',
  'IS NULL',
  'IS NOT NULL',
  'JOIN',
  'LEFT JOIN',
  'LIKE',
  'LIMIT',
  'NOT',
  'NOT NULL',
  'OR',
  'ORDER BY',
  'OUTER JOIN',
  'PRIMARY KEY',
  'PROCEDURE',
  'RIGHT JOIN',
  'ROWNUM',
  'SELECT',
  'SELECT DISTINCT',
  'SELECT INTO',
  'SELECT TOP',
  'SET',
  'TABLE',
  'TOP',
  'TRUNCATE TABLE',
  'UNION',
  'UNION ALL',
  'UNIQUE',
  'UPDATE',
  'VALUES',
  'VIEW',
  'WHERE',
]);

// validate input string whether it is a sql
function validateSQL(sql: string) {
  // convert sql to uppercase to perform case-insensitive comparison
  const upperCaseSQL = sql.toUpperCase();

  // iterate through the SQL keywords set and check if any of them exist in the SQL statement
  for (const keyword of sqlKeywords) {
    if (upperCaseSQL.includes(keyword)) {
      return true;
    }
  }

  // if no SQL keywords are found, the input string is not a valid SQL statement
  return false;
}

// show error toast message
function showToastMessage() {
  showToast({
    style: Toast.Style.Failure,
    title: 'Please copy a valid SQL clause',
  });
}
