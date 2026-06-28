/**
 * Consolidated performance tests for CI/CD optimization
 */

import { describe, it, expect } from "@jest/globals";
import { findGreffeByCodePostal } from "../lib/greffe-lookup";
import { compressGreffeData, decompressGreffeData } from "../lib/greffe-compressor";
import { formatAddress } from "../lib/utils";
import { expandStreetType } from "../lib/address-formatter";
import { AddressInfo } from "../types";

describe("Performance Tests", () => {
  describe("Greffe Lookup Performance", () => {
    it("should perform single greffe lookup under 10ms", () => {
      const startTime = performance.now();
      const result = findGreffeByCodePostal("75001");
      const elapsed = performance.now() - startTime;

      expect(result).toBe("PARIS");
      expect(elapsed).toBeLessThan(10);
    });

    it("should handle batch lookups efficiently", () => {
      const testCodes = ["75001", "13001", "69001", "75008", "13002"];
      const startTime = performance.now();

      const results = testCodes.map((code) => findGreffeByCodePostal(code));
      const elapsed = performance.now() - startTime;

      expect(results.every((result) => result !== null)).toBe(true);
      expect(elapsed).toBeLessThan(50); // 10ms per lookup max
    });
  });

  describe("Address Formatting Performance", () => {
    it("should format addresses efficiently", () => {
      const testAddress: AddressInfo = {
        adresse: {
          numeroVoie: "123",
          typeVoie: "BD",
          libelleVoie: "VICTOR HUGO",
          codePostal: "75001",
          commune: "PARIS",
        },
      };

      const startTime = performance.now();

      // Test 100 address formatting operations
      for (let i = 0; i < 100; i++) {
        formatAddress(testAddress);
      }

      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(50); // <0.5ms per address
    });

    it("should expand street types quickly", () => {
      const streetTypes = ["BD", "AV", "RUE", "PL", "CHE"];
      const startTime = performance.now();

      // Test 1000 expansions
      for (let i = 0; i < 1000; i++) {
        streetTypes.forEach((type) => expandStreetType(type));
      }

      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(100); // <0.02ms per expansion
    });
  });

  describe("Data Compression Performance", () => {
    it("should compress/decompress data efficiently", () => {
      const sampleData = {
        "75001": "PARIS",
        "75002": "PARIS",
        "75003": "PARIS",
        "13001": "MARSEILLE",
        "69001": "LYON",
      };

      const startTime = performance.now();
      const compressed = compressGreffeData(sampleData);
      const decompressed = decompressGreffeData(compressed, "75001");
      const elapsed = performance.now() - startTime;

      expect(decompressed).toBe("PARIS");
      expect(elapsed).toBeLessThan(20); // Allow for system performance variations
    });
  });

  describe("Memory Usage Validation", () => {
    it("should not leak memory during intensive operations", () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform intensive operations
      for (let i = 0; i < 1000; i++) {
        findGreffeByCodePostal("75001");
        expandStreetType("BD");
        formatAddress({
          adresse: {
            numeroVoie: String(i),
            typeVoie: "RUE",
            libelleVoie: "TEST",
            codePostal: "75001",
            commune: "PARIS",
          },
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
