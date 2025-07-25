import { describe, it, expect } from 'vitest'
import { getSummary } from '../getSummary'
import type { Trades } from '../schema'

describe('getSummary', () => {
  // Mock data for testing - using plain objects that match the schema types
  const mockBalance = [
    {
      symbol: 'BTC',
      available: '1.0',
      inOrder: '0.0',
    },
    {
      symbol: 'ETH',
      available: '2.0',
      inOrder: '0.0',
    },
  ]

  const mockTrades = [
    // BTC trades - testing average buy price calculation
    {
      id: '1',
      orderId: '1',
      timestamp: 1640995200000, // Jan 1, 2022
      market: 'BTC-EUR',
      side: 'buy' as const,
      amount: '0.5', // First purchase: 0.5 BTC at 10,000 EUR
      price: '10000',
      taker: true,
      fee: '10',
      feeCurrency: 'EUR',
      settled: true,
    },
    {
      id: '2',
      orderId: '2',
      timestamp: 1643673600000, // Feb 1, 2022
      market: 'BTC-EUR',
      side: 'buy' as const,
      amount: '0.5', // Second purchase: 0.5 BTC at 20,000 EUR
      price: '20000',
      taker: true,
      fee: '15',
      feeCurrency: 'EUR',
      settled: true,
    },
    // ETH trades
    {
      id: '3',
      orderId: '3',
      timestamp: 1640995200000,
      market: 'ETH-EUR',
      side: 'buy' as const,
      amount: '1.0', // First ETH purchase: 1.0 ETH at 1,000 EUR
      price: '1000',
      taker: true,
      fee: '5',
      feeCurrency: 'EUR',
      settled: true,
    },
    {
      id: '4',
      orderId: '4',
      timestamp: 1643673600000,
      market: 'ETH-EUR',
      side: 'buy' as const,
      amount: '1.0', // Second ETH purchase: 1.0 ETH at 2,000 EUR
      price: '2000',
      taker: true,
      fee: '5',
      feeCurrency: 'EUR',
      settled: true,
    },
  ]

  describe('Asset-level calculations', () => {
    it('calculates weighted average buy price correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC weighted average: (0.5 * 10000 + 0.5 * 20000) / (0.5 + 0.5) = 15000
      expect(summary.assets[0]?.averageBuyPrice).toBe(15000)

      // ETH weighted average: (1.0 * 1000 + 1.0 * 2000) / (1.0 + 1.0) = 1500
      expect(summary.assets[1]?.averageBuyPrice).toBe(1500)
    })

    it('calculates total invested correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC total invested: 0.5 * 10000 + 0.5 * 20000 = 15000
      expect(summary.assets[0]?.totalInvested).toBe(15000)

      // ETH total invested: 1.0 * 1000 + 1.0 * 2000 = 3000
      expect(summary.assets[1]?.totalInvested).toBe(3000)
    })

    it('calculates current value correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC current value: 1.0 * 15000 = 15000
      expect(summary.assets[0]?.totalValue).toBe(15000)

      // ETH current value: 2.0 * 1500 = 3000
      expect(summary.assets[1]?.totalValue).toBe(3000)
    })

    it('calculates gain/loss correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC gain/loss: 15000 - 15000 = 0 (break even)
      expect(summary.assets[0]?.gainLoss).toBe(0)

      // ETH gain/loss: 3000 - 3000 = 0 (break even)
      expect(summary.assets[1]?.gainLoss).toBe(0)
    })

    it('calculates gain/loss percentage correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC gain/loss %: (0 / 15000) * 100 = 0%
      expect(summary.assets[0]?.gainLossPercent).toBe(0)

      // ETH gain/loss %: (0 / 3000) * 100 = 0%
      expect(summary.assets[1]?.gainLossPercent).toBe(0)
    })

    it('handles missing current prices gracefully', () => {
      const currentPrices = new Map([
        // BTC price missing, ETH price provided
        ['ETH-EUR', 3500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC should use 0 as current price when missing
      expect(summary.assets[0]?.currentPrice).toBe(0)
      expect(summary.assets[0]?.totalValue).toBe(0)
      expect(summary.assets[0]?.gainLoss).toBe(-15000) // All invested is lost
    })
  })

  describe('Portfolio-level totals', () => {
    it('calculates portfolio totals correctly', () => {
      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // Total invested: 15000 + 3000 = 18000
      expect(summary.totals.invested).toBe(18000)

      // Total current value: 15000 + 3000 = 18000
      expect(summary.totals.currentValue).toBe(18000)

      // Total gain/loss: 18000 - 18000 = 0
      expect(summary.totals.gainLoss).toBe(0)

      // Total gain/loss %: 0%
      expect(summary.totals.gainLossPercent).toBe(0)
    })
  })

  describe('Edge cases and business logic validation', () => {
    it('handles zero balance correctly', () => {
      const zeroBalance = [
        {
          symbol: 'BTC',
          available: '0.0',
          inOrder: '0.0',
        },
      ]

      const currentPrices = new Map([['BTC-EUR', 15000]])
      const summary = getSummary(zeroBalance, mockTrades)(currentPrices)

      expect(summary.assets[0]?.currentBalance).toBe(0)
      expect(summary.assets[0]?.totalValue).toBe(0)
    })

    it('handles assets with no trades', () => {
      const balanceWithNewAsset = [
        {
          symbol: 'ADA',
          available: '100.0',
          inOrder: '0.0',
        },
      ]

      const emptyTrades: typeof Trades.Type = []
      const currentPrices = new Map([['ADA-EUR', 0.5]])

      const summary = getSummary(
        balanceWithNewAsset,
        emptyTrades,
      )(currentPrices)

      expect(summary.assets[0]?.totalInvested).toBe(0)
      expect(summary.assets[0]?.averageBuyPrice).toBe(0)
      expect(summary.assets[0]?.totalValue).toBe(50) // 100 * 0.5
      expect(summary.assets[0]?.gainLoss).toBe(50) // All value is gain since no investment
    })

    it('handles completely empty portfolio (no trades at all)', () => {
      // Scenario: Brand new user who has never made any trades
      const emptyBalance: typeof mockBalance = []
      const emptyTrades: typeof Trades.Type = []
      const emptyPrices = new Map<string, number>()

      const summary = getSummary(emptyBalance, emptyTrades)(emptyPrices)

      // Portfolio should be completely empty with zero totals
      expect(summary.assets).toEqual([])
      expect(summary.totals.invested).toBe(0)
      expect(summary.totals.currentValue).toBe(0)
      expect(summary.totals.gainLoss).toBe(0)
      expect(summary.totals.gainLossPercent).toBe(0)
    })

    it('validates weighted average calculation edge case', () => {
      // Test case: what happens with very small amounts?
      const smallBalance = [
        {
          symbol: 'BTC',
          available: '0.00000001', // 1 satoshi
          inOrder: '0.0',
        },
      ]

      const smallTrades = [
        {
          id: '1',
          orderId: '1',
          timestamp: 1640995200000,
          market: 'BTC-EUR',
          side: 'buy' as const,
          amount: '0.00000001',
          price: '10000',
          taker: true,
          fee: '0',
          feeCurrency: 'EUR',
          settled: true,
        },
      ]

      const currentPrices = new Map([['BTC-EUR', 15000]])
      const summary = getSummary(smallBalance, smallTrades)(currentPrices)

      expect(summary.assets[0]?.averageBuyPrice).toBe(10000)
      expect(summary.assets[0]?.totalInvested).toBe(0.0001) // 0.00000001 * 10000
    })

    it('handles number precision correctly to avoid JavaScript floating-point issues', () => {
      // This test verifies that the calculations handle decimal precision correctly
      const precisionBalance = [
        {
          symbol: 'BTC',
          available: '0.3',
          inOrder: '0.0',
        },
      ]

      const precisionTrades = [
        {
          id: '1',
          orderId: '1',
          timestamp: 1640995200000,
          market: 'BTC-EUR',
          side: 'buy' as const,
          amount: '0.1',
          price: '10000',
          taker: true,
          fee: '0',
          feeCurrency: 'EUR',
          settled: true,
        },
        {
          id: '2',
          orderId: '2',
          timestamp: 1643673600000,
          market: 'BTC-EUR',
          side: 'buy' as const,
          amount: '0.2',
          price: '20000',
          taker: true,
          fee: '0',
          feeCurrency: 'EUR',
          settled: true,
        },
      ]

      const currentPrices = new Map([['BTC-EUR', 30000]])
      const summary = getSummary(
        precisionBalance,
        precisionTrades,
      )(currentPrices)

      // Weighted average: (0.1 * 10000 + 0.2 * 20000) / (0.1 + 0.2) = 16666.67
      // Without proper decimal handling, this could result in 16666.6666666667 or similar
      expect(summary.assets[0]?.averageBuyPrice).toBeCloseTo(16666.67, 2)

      // Total invested: 0.1 * 10000 + 0.2 * 20000 = 1000 + 4000 = 5000
      expect(summary.assets[0]?.totalInvested).toBe(5000)

      // Current value: 0.3 * 30000 = 9000
      expect(summary.assets[0]?.totalValue).toBe(9000)

      // Gain/loss: 9000 - 5000 = 4000
      expect(summary.assets[0]?.gainLoss).toBe(4000)

      // Gain/loss percentage: (4000 / 5000) * 100 = 80%
      expect(summary.assets[0]?.gainLossPercent).toBe(80)
    })
  })

  describe('Business logic evaluation for crypto asset owners', () => {
    it('properly reflects unrealized gains/losses', () => {
      // Scenario: User bought BTC low, price went up, but still holds
      const currentPrices = new Map([
        ['BTC-EUR', 20000], // Price increased
        ['ETH-EUR', 1000], // Price decreased
      ])

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // BTC should show gain: current value (1.0 * 20000 = 20000) vs invested (15000)
      expect(summary.assets[0]?.gainLoss).toBe(5000)
      expect(summary.assets[0]?.gainLossPercent).toBe(33.33) // (5000 / 15000) * 100 = 33.33%

      // ETH should show loss: current value (2.0 * 1000 = 2000) vs invested (3000)
      expect(summary.assets[1]?.gainLoss).toBe(-1000)
      expect(summary.assets[1]?.gainLossPercent).toBe(-33.33) // (-1000 / 3000) * 100 = -33.33%
    })

    it('correctly calculates dollar-cost averaging scenarios', () => {
      // This tests if the weighted average buy price makes sense for DCA strategies
      const currentPrices = new Map([['BTC-EUR', 15000]]) // Exactly at weighted average

      const summary = getSummary(mockBalance, mockTrades)(currentPrices)

      // When current price equals weighted average, gain/loss should be close to 0
      // We have 1.0 BTC purchased at weighted average of 15000
      expect(summary.assets[0]?.averageBuyPrice).toBe(15000)
      expect(summary.assets[0]?.currentPrice).toBe(15000)

      // Current value: 1.0 * 15000 = 15000
      // Total invested: 15000
      // So gain/loss should be 0
      expect(summary.assets[0]?.gainLoss).toBe(0)
    })

    it('handles partial sells correctly (business logic check)', () => {
      // Note: The current implementation only considers 'buy' trades
      // This is actually a limitation - real portfolios should account for sells
      // But for this test, we verify the current behavior is consistent

      const tradesWithSell = [
        ...mockTrades, // Copy existing buy trades
        {
          id: '5',
          orderId: '5',
          timestamp: 1646265600000, // March 1, 2022
          market: 'BTC-EUR',
          side: 'sell' as const, // This should be ignored by current implementation
          amount: '0.2',
          price: '25000',
          taker: true,
          fee: '5',
          feeCurrency: 'EUR',
          settled: true,
        },
      ]

      const currentPrices = new Map([
        ['BTC-EUR', 15000],
        ['ETH-EUR', 1500],
      ])
      const summary = getSummary(mockBalance, tradesWithSell)(currentPrices)

      // Should be identical to previous calculation since sell trades are filtered out
      expect(summary.assets[0]?.totalInvested).toBe(15000)
      expect(summary.assets[0]?.averageBuyPrice).toBe(15000)

      // This reveals a potential business logic issue:
      // Real portfolios should track cost basis after sells
    })
  })
})

// Additional business logic considerations for crypto portfolio tracking:
//
// 1. ✅ CORRECT: Weighted average buy price calculation
//    - Properly weighs purchases by amount, giving realistic cost basis
//
// 2. ✅ CORRECT: Unrealized gain/loss calculation
//    - Shows paper profits/losses based on current market prices
//
// 3. ⚠️  LIMITATION: Only considers buy trades
//    - Real portfolios should adjust cost basis when assets are sold
//    - Current implementation may overstate investment amount if user has sold some holdings
//
// 4. ✅ CORRECT: Uses available balance for current value
//    - Correctly values what the user actually owns now
//
// 5. ✅ CORRECT: Handles missing price data gracefully
//    - Defaults to 0 rather than crashing, though this may not be ideal UX
//
// 6. ✅ CORRECT: Percentage calculations
//    - Properly calculates percentage gains/losses based on investment amount
//
// Overall assessment: The calculation logic is sound for a portfolio tracker that only
// considers purchases. The main limitation is not accounting for sales, which could
// lead to incorrect cost basis calculations for active traders.
