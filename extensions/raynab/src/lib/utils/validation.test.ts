import { test, describe, expect } from 'vitest';
import { isNumberLike } from './validation';

describe('isNumberLike', () => {
  test('validates positive integers', () => {
    expect(isNumberLike('123')).toBe(true);
    expect(isNumberLike('0')).toBe(true);
    expect(isNumberLike('+123')).toBe(true);
  });

  test('validates negative integers', () => {
    expect(isNumberLike('-123')).toBe(true);
  });

  test('validates decimal numbers', () => {
    expect(isNumberLike('123.45')).toBe(true);
    expect(isNumberLike('-123.45')).toBe(true);
    expect(isNumberLike('0.45')).toBe(true);
    expect(isNumberLike('-0.45')).toBe(true);
    expect(isNumberLike('+123.45')).toBe(true);
  });

  test('handles whitespace', () => {
    expect(isNumberLike('  123  ')).toBe(true);
    expect(isNumberLike(' -123.45 ')).toBe(true);
  });

  test('rejects invalid number formats', () => {
    expect(isNumberLike('123.45.67')).toBe(false); // multiple decimal points
    expect(isNumberLike('123.')).toBe(false); // trailing decimal
    expect(isNumberLike('.123')).toBe(false); // leading decimal
    expect(isNumberLike('abc')).toBe(false); // letters
    expect(isNumberLike('12a3')).toBe(false); // mixed letters and numbers
    expect(isNumberLike('')).toBe(false); // empty string
    expect(isNumberLike(' ')).toBe(false); // whitespace only
    expect(isNumberLike('1,234')).toBe(false); // thousands separator
    expect(isNumberLike('1e5')).toBe(false); // scientific notation
  });
});
