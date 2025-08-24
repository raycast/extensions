/**
 * Greffe data compression utilities
 * Converts large postal code → greffe mappings into efficient range-based format
 */

export interface GreffeRange {
  start: string;
  end: string;
  greffe: string;
}

export interface CompactGreffeData {
  ranges: GreffeRange[];
  singles: Record<string, string>; // For isolated codes that don't benefit from ranges
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    generatedAt: string;
  };
}

/**
 * Compresses postal code → greffe mapping into range-based format
 */
export function compressGreffeData(postalCodeMap: Record<string, string>): CompactGreffeData {
  const entries = Object.entries(postalCodeMap).sort(([a], [b]) => a.localeCompare(b));
  const ranges: GreffeRange[] = [];
  const singles: Record<string, string> = {};

  if (entries.length === 0) {
    return {
      ranges: [],
      singles: {},
      metadata: {
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  let currentRange = {
    start: entries[0][0],
    end: entries[0][0],
    greffe: entries[0][1],
    count: 1,
  };

  // Build sequences of consecutive postal codes with same greffe
  for (let i = 1; i < entries.length; i++) {
    const [code, greffe] = entries[i];
    const prevCode = parseInt(entries[i - 1][0]);
    const currCode = parseInt(code);

    // Check if this continues the current sequence
    if (greffe === currentRange.greffe && currCode === prevCode + 1) {
      currentRange.end = code;
      currentRange.count++;
    } else {
      // Close current range and start new one
      if (currentRange.count >= 3) {
        // Range is efficient (saves space vs individual entries)
        ranges.push({
          start: currentRange.start,
          end: currentRange.end,
          greffe: currentRange.greffe,
        });
      } else {
        // Too short to be worth a range, store as singles
        const start = parseInt(currentRange.start);
        const end = parseInt(currentRange.end);
        for (let code = start; code <= end; code++) {
          singles[code.toString().padStart(5, "0")] = currentRange.greffe;
        }
      }

      currentRange = {
        start: code,
        end: code,
        greffe: greffe,
        count: 1,
      };
    }
  }

  // Handle last range
  if (currentRange.count >= 3) {
    ranges.push({
      start: currentRange.start,
      end: currentRange.end,
      greffe: currentRange.greffe,
    });
  } else {
    const start = parseInt(currentRange.start);
    const end = parseInt(currentRange.end);
    for (let code = start; code <= end; code++) {
      singles[code.toString().padStart(5, "0")] = currentRange.greffe;
    }
  }

  // Calculate compression metrics
  const originalSize = entries.length;
  const compressedSize = ranges.length + Object.keys(singles).length;
  const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    ranges,
    singles,
    metadata: {
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 10) / 10,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Finds greffe for a postal code using compressed range-based data
 * Optimized for fast lookup with O(log n) performance for ranges
 */
export function findGreffeInCompressedData(postalCode: string, data: CompactGreffeData): string | null {
  if (!postalCode) return null;

  // First check singles (O(1) lookup)
  const singleResult = data.singles[postalCode];
  if (singleResult) return singleResult;

  // Binary search through ranges (O(log n))
  const ranges = data.ranges;
  let left = 0;
  let right = ranges.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = ranges[mid];

    if (postalCode >= range.start && postalCode <= range.end) {
      return range.greffe;
    }

    if (postalCode < range.start) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return null;
}

/**
 * Alias for findGreffeInCompressedData for convenience
 * Decompresses a single postal code lookup
 */
export function decompressGreffeData(compressed: CompactGreffeData, postalCode: string): string | null {
  return findGreffeInCompressedData(postalCode, compressed);
}

/**
 * Validates that compressed data maintains same lookup results as original
 */
export function validateCompression(
  original: Record<string, string>,
  compressed: CompactGreffeData,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Test all original entries work in compressed format
  for (const [code, expectedGreffe] of Object.entries(original)) {
    const compressedResult = findGreffeInCompressedData(code, compressed);
    if (compressedResult !== expectedGreffe) {
      errors.push(`Code ${code}: expected "${expectedGreffe}", got "${compressedResult}"`);
    }
  }

  // Test some non-existent codes return null
  const testCodes = ["00000", "99999", "12345"];
  for (const code of testCodes) {
    if (!original[code]) {
      const result = findGreffeInCompressedData(code, compressed);
      if (result !== null) {
        errors.push(`Non-existent code ${code} should return null, got "${result}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 10), // Limit error output
  };
}
