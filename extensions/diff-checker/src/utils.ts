import * as Diff from 'diff';

function getDiffText(original: string, changed: string): string {
  const changes = Diff.diffLines(original + '\n', changed + '\n');
  const text = changes
    .map((change) => {
      if (change.added) {
        return `>>> ${change.value}`;
      }
      if (change.removed) {
        return `<<< ${change.value}`;
      }
      return change.value;
    })
    .join('');
  return text.substring(0, text.length - 1);
}

export { getDiffText };
