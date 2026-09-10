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
    assert.equal(duration(3599), '1h 0m');
    assert.equal(duration(20), '<1m');
  });
});
