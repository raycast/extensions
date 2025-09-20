import { test, describe, expect } from 'vitest';

import { autoDistribute, formatToReadableAmount, formatToReadableFrequency } from './transactions';
import { CurrencyFormat } from '@srcTypes';

describe('properly format milliunit amounts to readable amounts', () => {
  describe('format an amount with no currency format provided', () => {
    const MILLUNIT_AMOUNT = 120_000_000;

    test('with a locale', () => {
      expect(formatToReadableAmount({ amount: MILLUNIT_AMOUNT })).toBe('120,000');
    });

    test('without a locale', () => {
      expect(formatToReadableAmount({ amount: MILLUNIT_AMOUNT, locale: false })).toBe('120000');
    });
  });

  describe('format an amount with a currency format provided', () => {
    const MILLUNIT_AMOUNT = 123_930;
    describe('format USD', () => {
      const USD_FORMAT = {
        display_symbol: true,
        symbol_first: true,
        decimal_digits: 2,
        currency_symbol: '$',
      };

      test('positive amount with decimals', () => {
        expect(formatToReadableAmount({ amount: MILLUNIT_AMOUNT, currency: USD_FORMAT as CurrencyFormat })).toBe(
          '$123.93',
        );
      });

      test('negative amount with decimals', () => {
        expect(formatToReadableAmount({ amount: -1 * MILLUNIT_AMOUNT, currency: USD_FORMAT as CurrencyFormat })).toBe(
          '-$123.93',
        );
      });
    });

    describe('format Euro', () => {
      const EURO_FORMAT = {
        display_symbol: true,
        symbol_first: false,
        decimal_digits: 2,
        currency_symbol: '€',
      };

      test('positive amount with decimals', () => {
        expect(formatToReadableAmount({ amount: MILLUNIT_AMOUNT, currency: EURO_FORMAT as CurrencyFormat })).toBe(
          '123.93€',
        );
      });

      test('negative amount with decimals', () => {
        expect(formatToReadableAmount({ amount: -1 * MILLUNIT_AMOUNT, currency: EURO_FORMAT as CurrencyFormat })).toBe(
          '-123.93€',
        );
      });
    });
  });
});

describe('autoDistribute', () => {
  test('evenly distributes amount when no rounding is needed', () => {
    expect(autoDistribute(100, 4)).toEqual([25, 25, 25, 25]);
  });

  test('handles rounding by adjusting first amount to maintain total', () => {
    // $100 split into 3 should be [33.34, 33.33, 33.33] to maintain total
    expect(autoDistribute(100, 3)).toEqual([33.34, 33.33, 33.33]);
  });

  test('handles negative amounts', () => {
    expect(autoDistribute(-100, 4)).toEqual([-25, -25, -25, -25]);
  });

  test('handles decimal input amounts', () => {
    expect(autoDistribute(100.5, 2)).toEqual([50.25, 50.25]);
  });

  test('handles single dividend', () => {
    expect(autoDistribute(100, 1)).toEqual([100]);
  });

  test('handles zero amount', () => {
    expect(autoDistribute(0, 3)).toEqual([0, 0, 0]);
  });

  test('maintains total amount after distribution', () => {
    const amount = 100;
    const parts = 3;
    const distributed = autoDistribute(amount, parts);

    // Sum should equal original amount
    const sum = distributed.reduce((acc, curr) => acc + curr, 0);
    expect(sum).toBeCloseTo(amount, 2); // Using toBeCloseTo for floating point comparison
  });

  test('rounds all numbers to 2 decimal places', () => {
    const distributed = autoDistribute(100, 3);

    distributed.forEach((amount) => {
      const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});

describe('formatToReadableFrequency', () => {
  test('formats never frequency', () => {
    expect(formatToReadableFrequency('never')).toBe('Never repeats');
    expect(formatToReadableFrequency('never', false)).toBe('Never');
  });

  test('formats daily frequency', () => {
    expect(formatToReadableFrequency('daily')).toBe('Repeats Daily');
    expect(formatToReadableFrequency('daily', false)).toBe('Daily');
  });

  test('formats weekly frequency', () => {
    expect(formatToReadableFrequency('weekly')).toBe('Repeats Weekly');
    expect(formatToReadableFrequency('weekly', false)).toBe('Weekly');
  });

  test('formats monthly frequency', () => {
    expect(formatToReadableFrequency('monthly')).toBe('Repeats Monthly');
    expect(formatToReadableFrequency('monthly', false)).toBe('Monthly');
  });

  test('formats yearly frequency', () => {
    expect(formatToReadableFrequency('yearly')).toBe('Repeats Yearly');
    expect(formatToReadableFrequency('yearly', false)).toBe('Yearly');
  });
});
