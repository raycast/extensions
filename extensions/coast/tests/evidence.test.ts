import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accessibilityEvidence, captureEvidence, timestampEvidence } from '../src/evidence';

const frame = {frame_id: 1, timestamp: '2026-09-09T17:30:00+08:00', application: 'Example', domain: null, url: null, title: 'Example', ocr_text: 'overlay text', warnings: ['Overlay detected']};
const tree = {...frame, has_tree: true, tree_text: '界界', is_partial_tree: true, total_node_count: 2, stored_bytes: 0};

describe('evidence contracts', () => {
  it('keeps storage reports distinct from measured UTF-8 payload bytes', () => {
    const result = accessibilityEvidence(tree);
    assert.equal(result.stored_bytes, 0);
    assert.equal(result.returned_bytes, 6);
    assert.equal(result.has_payload, true);
    assert.equal(result.completeness, 'unknown');
    assert.ok(result.warnings.some(warning => warning.includes('conflicts')));
    assert.ok(result.warnings.includes('Overlay detected'));
  });
  it('distinguishes filtered-empty, absent, and truncated accessibility output', () => {
    assert.equal(accessibilityEvidence({...tree, tree_text: ''}).completeness, 'filtered-empty');
    assert.equal(accessibilityEvidence({...tree, has_tree: false, tree_text: ''}).completeness, 'unavailable');
    const result = accessibilityEvidence({...tree, stored_bytes: 6, is_partial_tree: false}, 1);
    assert.equal(result.completeness, 'partial');
    assert.equal(result.truncated, true);
    assert.equal(result.returned_bytes, Buffer.byteLength(result.tree_text));
  });
  it('converts explicit offsets without relabeling Manila wall time as UTC', () => {
    assert.equal(timestampEvidence(frame.timestamp).timestamp_utc, '2026-09-09T09:30:00.000Z');
    assert.equal(timestampEvidence('2026-09-09T09:30:00Z').timestamp_utc, '2026-09-09T09:30:00.000Z');
    assert.equal(timestampEvidence('2026-09-09T17:30:00').timestamp_basis, 'local-wall-time');
    assert.equal(timestampEvidence('invalid').timestamp_utc, undefined);
  });
  it('preserves source warnings and identifies OCR truncation', () => {
    const result = captureEvidence(frame, 3);
    assert.equal(result.ocr_truncated, true);
    assert.ok(result.warnings.includes('Overlay detected'));
  });
});
