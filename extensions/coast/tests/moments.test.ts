import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupMoments, captureSubtitle } from '../src/moments';
import { aroundMoment, duration, readableTime } from '../src/dates';
const frame = (id: number, timestamp: string, url = 'https://example.com') => ({ frame_id: id, timestamp, url, title: 'Example', application: 'Example', domain: null, ocr_text: '' });
describe('moment navigation', () => {
  it('groups adjacent context without losing or duplicating selected frames', () => {
    const a = frame(1, '2026-09-09T10:00:00');
    const b = frame(2, '2026-09-09T10:01:00');
    const c = frame(3, '2026-09-09T10:04:00');
    assert.deepEqual(groupMoments([c, b, a, a]).map(g => g.map(f => f.frame_id)), [[1, 2], [3]]);
    assert.equal(groupMoments([a, { ...b, url: 'https://different.example' }]).length, 2);
    assert.equal(captureSubtitle(a), undefined);
  });
  it('expands local timestamps across midnight without adding a UTC shift', () => {
    assert.equal(aroundMoment('2026-09-09T00:01:00', 2), '2026-09-08T23:59:00|2026-09-09T00:03:00');
    assert.throws(() => aroundMoment('invalid', 2));
    assert.equal(readableTime('invalid'), 'invalid');
    assert.equal(duration(3599), '59m');
    assert.equal(duration(20), '<1m');
  });
  it('orders mixed-offset timestamps by instant without grouping distant captures', () => {
    const early = frame(1, '2026-09-09T10:00:00+08:00');
    const adjacent = frame(2, '2026-09-09T02:01:00Z');
    const later = frame(3, '2026-09-09T03:00:00Z');
    const input = [later, adjacent, early];
    assert.deepEqual(groupMoments(input).map(g => g.map(f => f.frame_id)), [[1, 2], [3]]);
    assert.deepEqual(input.map(f => f.frame_id), [3, 2, 1]);
  });
  it('breaks equal-instant ties by frame ID and keeps invalid timestamps separate', () => {
    const a = frame(1, '2026-09-09T10:00:00+08:00');
    const b = frame(2, '2026-09-09T02:00:00Z');
    const invalid = frame(3, 'invalid');
    assert.deepEqual(groupMoments([invalid, b, a]).map(g => g.map(f => f.frame_id)), [[1, 2], [3]]);
  });
  it('never rounds compact durations above the completed minute', () => {
    for (const [seconds, expected] of [
      [0, '0m'], [59, '<1m'], [60, '1m'], [119, '1m'],
      [3569, '59m'], [3570, '59m'], [3599, '59m'],
      [3600, '1h 0m'], [3659, '1h 0m'], [3660, '1h 1m'],
      [7199, '1h 59m'], [7200, '2h 0m'],
    ] as const) assert.equal(duration(seconds), expected, `${seconds} seconds`);
  });
});
