import * as Diff from 'diff';

function getDiffText(original: string, changed: string): string {
  const changes = Diff.diffLines(original + '\n', changed + '\n');
  const text = changes
    .map((change) => {
      const lines = change.value.split('\n');
      return lines
        .map((line) => (line ? `${getPrefix(change)} ${line}` : ''))
        .join('\n');
    })
    .join('');
  return text.substring(0, text.length - 1);
}

function getPrefix(change: Diff.Change) {
  if (change.added) {
    return '>>>';
  }
  if (change.removed) {
    return '<<<';
  }
  return '     ';
}

export { getDiffText };
