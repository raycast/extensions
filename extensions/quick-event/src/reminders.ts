export function parseDurationToMinutes(val: string, unit: string): number {
  let num = 0;
  val = val.trim().toLowerCase();
  if (val === 'a' || val === 'an' || val === 'one') {
    num = 1;
  } else if (val === 'half an' || val === 'half a' || val === 'half') {
    num = 0.5;
  } else if (val === 'two') {
    num = 2;
  } else if (val === 'three') {
    num = 3;
  } else {
    num = parseFloat(val);
  }

  const u = unit.toLowerCase();
  if (u.startsWith('m')) return Math.round(num);
  if (u.startsWith('h')) return Math.round(num * 60);
  if (u.startsWith('d')) return Math.round(num * 1440);
  if (u.startsWith('w')) return Math.round(num * 10080);
  return Math.round(num);
}

export function extractReminders(query: string): { query: string; reminders: number[] } {
  const reminders: number[] = [];
  const matchesToRemove: string[] = [];

  function addReminder(offset: number) {
    if (!reminders.includes(offset)) {
      reminders.push(offset);
    }
  }

  const numPattern = '(?:\\d+(?:\\.\\d+)?|half\\s+an?|half\\s+a|\\b(?:an?|one|two|three)\\b)';
  const unitPattern = '(?:min(?:ute)?s?|m\\b|hours?|hrs?|h\\b|days?|d\\b|weeks?|w\\b)';

  // Relative relation: "before", "prior to", "ahead of" (negative interval), or "after", "following", "post", "later" (positive interval)
  const relationPattern = '(?:before|prior(?:\\s+to)?|ahead(?:\\s+of)?|after|following|post|later)';
  const targetPattern = '(?:\\s+(?:the\\s+)?(?:event\\s+)?start|\\s+(?:the\\s+)?event)';
  const relationSuffix = `(?:\\s+(${relationPattern})${targetPattern}?)`;

  const onTimePattern =
    '(?:at\\s+(?:the\\s+)?(?:start|time\\s+of\\s+(?:the\\s+)?event|event\\s+start)|on\\s+time|when\\s+it\\s+starts)';

  const durationItemPattern = `(${numPattern})\\s*(${unitPattern})${relationSuffix}?`;

  function getOffset(numStr: string, unitStr: string, relStr?: string): number {
    const mins = parseDurationToMinutes(numStr, unitStr);
    if (relStr && /^(?:after|following|post|later)$/i.test(relStr)) {
      return mins; // positive interval for "after"
    }
    return -mins; // negative interval for "before"
  }

  // 1. "with 15m and 5m reminders/alerts" or "with 15m, 10m, and 5m reminders"
  const multiPrefixRegex = new RegExp(
    `(?:with|add|set)\\s+(?:a\\s+)?(?:${numPattern}\\s*${unitPattern}(?:\\s*,\\s*|\\s+and\\s+|\\s*,\\s*and\\s+))+${numPattern}\\s*${unitPattern}\\s+(?:reminders?|alerts?)${relationSuffix}?`,
    'gi',
  );
  let multiMatch: RegExpExecArray | null;
  while ((multiMatch = multiPrefixRegex.exec(query)) !== null) {
    matchesToRemove.push(multiMatch[0]);
    const relStr = multiMatch[1];
    const innerDurRegex = new RegExp(`(${numPattern})\\s*(${unitPattern})`, 'gi');
    let durM: RegExpExecArray | null;
    while ((durM = innerDurRegex.exec(multiMatch[0])) !== null) {
      const offset = getOffset(durM[1], durM[2], relStr);
      addReminder(offset);
    }
  }

  // 2. Chained reminder expressions starting with "remind me / alert me / reminder(s) / alert(s)"
  const chainHeader = `(?:(?:with|add|set)\\s+)?(?:a\\s+)?(?:remind\\s+me|alert\\s+me|reminders?|alerts?)(?:\\s+(?:for|of|about))?\\s+`;
  const itemOrOnTime = `(?:${onTimePattern}|${durationItemPattern})`;
  const chainSeparator = `(?:\\s*(?:[,;+]|\\band\\b)(?:\\s+and\\b)?\\s*)`;

  const fullChainRegex = new RegExp(
    `(${chainHeader})(${itemOrOnTime})((?:${chainSeparator}(?:(?:a\\s+)?(?:reminders?\\s+(?:for\\s+)?|alerts?\\s+(?:for\\s+)?)?)?${itemOrOnTime})*)${relationSuffix}?`,
    'gi',
  );

  let chainMatch: RegExpExecArray | null;
  while ((chainMatch = fullChainRegex.exec(query)) !== null) {
    matchesToRemove.push(chainMatch[0]);
    const fullText = chainMatch[0];

    const onTimeRegex = new RegExp(onTimePattern, 'gi');
    if (onTimeRegex.test(fullText)) {
      addReminder(0);
    }

    const trailingRelMatch = fullText.match(new RegExp(`(${relationPattern})${targetPattern}?\\s*$`, 'i'));
    const trailingRel = trailingRelMatch ? trailingRelMatch[1] : chainMatch[chainMatch.length - 1];

    const durExtractRegex = new RegExp(`(${numPattern})\\s*(${unitPattern})${relationSuffix}?`, 'gi');
    let dMatch: RegExpExecArray | null;
    while ((dMatch = durExtractRegex.exec(fullText)) !== null) {
      const rel = dMatch[3] || trailingRel;
      const offset = getOffset(dMatch[1], dMatch[2], rel);
      addReminder(offset);
    }
  }

  // 3. Prefix duration items: "with [a] 15m reminder" / "with a 1.5 hour reminder" / "with an hour reminder"
  const prefixDurRegex = new RegExp(
    `(?:(?:with|add|set)\\s+(?:a\\s+)?)?(${numPattern})\\s*(${unitPattern})\\s+(?:reminders?|alerts?)${relationSuffix}?(?=\\s*(?:[,;+]|\\band\\b|$|\\s+before\\b|\\s+prior\\b|\\s+after\\b))`,
    'gi',
  );
  let prefixMatch: RegExpExecArray | null;
  while ((prefixMatch = prefixDurRegex.exec(query)) !== null) {
    const fullMatch = prefixMatch[0];
    if (!matchesToRemove.some((m) => m.includes(fullMatch))) {
      matchesToRemove.push(fullMatch);
      const offset = getOffset(prefixMatch[1], prefixMatch[2], prefixMatch[3]);
      addReminder(offset);
    }
  }

  // 4. Standalone "reminder/alert X min before/after [the event]"
  const standaloneRegex = new RegExp(
    `\\b(?:remind|reminders?|alerts?)\\s+(${numPattern})\\s*(${unitPattern})${relationSuffix}`,
    'gi',
  );
  let standMatch: RegExpExecArray | null;
  while ((standMatch = standaloneRegex.exec(query)) !== null) {
    const fullMatch = standMatch[0];
    if (!matchesToRemove.some((m) => m.includes(fullMatch))) {
      matchesToRemove.push(fullMatch);
      const offset = getOffset(standMatch[1], standMatch[2], standMatch[3]);
      addReminder(offset);
    }
  }

  let cleanQuery = query;
  if (matchesToRemove.length > 0) {
    for (const m of matchesToRemove) {
      cleanQuery = cleanQuery.replace(m, ' ');
    }
    // Only run trailing connector cleanup when a reminder was actually matched and removed!
    // Never strip "event" or "the event" in this cleanup.
    cleanQuery = cleanQuery
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/(?:\s*[,;+]|\s+(?:and|with|at|for))+\s*$/i, '')
      .trim();
  }

  // Sort reminders from earliest before event to latest
  reminders.sort((a, b) => a - b);

  return { query: cleanQuery, reminders };
}

export function formatReminderLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'At start';
  const absMins = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? 'before' : 'after';
  if (absMins < 60) {
    return `${absMins}m ${direction}`;
  }
  const hours = Math.floor(absMins / 60);
  const remainingMins = absMins % 60;
  if (hours < 24) {
    if (remainingMins === 0) {
      return `${hours}h ${direction}`;
    }
    return `${hours}h ${remainingMins}m ${direction}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d ${direction}`;
  }
  return `${days}d ${remainingHours}h ${direction}`;
}
