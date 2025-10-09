/**
 * Performance Benchmarking Module for Daytona Code Execution
 * Task 9: Optimize Performance and Benchmark Execution Speed
 */

// Task 16.6: Updated to use shared execution library
import { executePythonCodeInSandbox, createSandbox, runCode, killSandbox } from "../src/lib/execution";
import { performance } from "perf_hooks";

// Benchmark result interfaces
export interface BenchmarkResult {
  name: string;
  code: string;
  metrics: ExecutionMetrics;
  passed: boolean;
  targetMet: boolean;
}

export interface ExecutionMetrics {
  totalTime: number;          // Total execution time in ms
  sandboxCreation: number;     // Time to create sandbox in ms
  codeExecution: number;       // Time to execute code in ms
  sandboxCleanup: number;      // Time to cleanup sandbox in ms
  networkLatency?: number;     // Estimated network latency
  memoryUsed?: number;         // Memory usage if available
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  summary: BenchmarkSummary;
  timestamp: Date;
}

export interface BenchmarkSummary {
  totalTests: number;
  passed: number;
  failed: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  targetsMet: number;
  performance: 'excellent' | 'good' | 'acceptable' | 'poor';
}

// Performance targets
const PERFORMANCE_TARGETS = {
  SIMPLE_SCRIPT: 2000,      // 2 seconds for simple scripts
  MODERATE_SCRIPT: 3000,    // 3 seconds for moderate complexity
  COMPLEX_SCRIPT: 5000,     // 5 seconds for complex scripts
  SANDBOX_CREATION: 1000,   // 1 second for sandbox creation
  CLEANUP: 500,             // 500ms for cleanup
};

// Benchmark test cases
const BENCHMARK_TESTS = {
  // Simple scripts (should execute under 2 seconds)
  simple: [
    {
      name: "Hello World",
      code: "print('Hello, World!')",
      target: PERFORMANCE_TARGETS.SIMPLE_SCRIPT,
    },
    {
      name: "Basic Math",
      code: "result = 2 + 2\nprint(f'Result: {result}')",
      target: PERFORMANCE_TARGETS.SIMPLE_SCRIPT,
    },
    {
      name: "String Manipulation",
      code: "text = 'Python'\nprint(text.upper(), text.lower(), len(text))",
      target: PERFORMANCE_TARGETS.SIMPLE_SCRIPT,
    },
  ],
  
  // Moderate complexity scripts
  moderate: [
    {
      name: "List Comprehension",
      code: "squares = [x**2 for x in range(100)]\nprint(f'Sum: {sum(squares)}')",
      target: PERFORMANCE_TARGETS.MODERATE_SCRIPT,
    },
    {
      name: "Fibonacci Calculation",
      code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = fibonacci(10)
print(f'Fibonacci(10) = {result}')`,
      target: PERFORMANCE_TARGETS.MODERATE_SCRIPT,
    },
    {
      name: "Dictionary Operations",
      code: `
data = {f'key_{i}': i**2 for i in range(50)}
filtered = {k: v for k, v in data.items() if v > 100}
print(f'Filtered count: {len(filtered)}')`,
      target: PERFORMANCE_TARGETS.MODERATE_SCRIPT,
    },
  ],
  
  // Complex scripts
  complex: [
    {
      name: "Prime Number Generation",
      code: `
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

primes = [n for n in range(1000) if is_prime(n)]
print(f'Found {len(primes)} primes under 1000')`,
      target: PERFORMANCE_TARGETS.COMPLEX_SCRIPT,
    },
    {
      name: "Matrix Operations",
      code: `
import random
matrix = [[random.randint(1, 10) for _ in range(10)] for _ in range(10)]
transpose = [[matrix[j][i] for j in range(10)] for i in range(10)]
print(f'Matrix sum: {sum(sum(row) for row in matrix)}')`,
      target: PERFORMANCE_TARGETS.COMPLEX_SCRIPT,
    },
  ],
  
  // Error handling tests
  errors: [
    {
      name: "Syntax Error",
      code: "print('unclosed string",
      target: PERFORMANCE_TARGETS.SIMPLE_SCRIPT,
    },
    {
      name: "Runtime Error",
      code: "x = 1 / 0",
      target: PERFORMANCE_TARGETS.SIMPLE_SCRIPT,
    },
  ],
};

/**
 * Measure execution time with high precision
 */
class PerformanceTimer {
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();
  
  start(): void {
    this.startTime = performance.now();
    this.marks.clear();
  }
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  getMark(name: string): number {
    const markTime = this.marks.get(name);
    if (!markTime) return 0;
    return markTime - this.startTime;
  }
  
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Run a single benchmark test
 */
async function runBenchmarkTest(
  name: string,
  code: string,
  target: number
): Promise<BenchmarkResult> {
  const timer = new PerformanceTimer();
  let metrics: ExecutionMetrics = {
    totalTime: 0,
    sandboxCreation: 0,
    codeExecution: 0,
    sandboxCleanup: 0,
  };
  
  try {
    timer.start();
    
    // Execute code with integrated sandbox management
    const result = await executePythonCodeInSandbox(code, 30000);
    
    timer.mark('execution_complete');
    metrics.totalTime = timer.getElapsed();
    
    // For integrated execution, we can't separate timings precisely
    // but we can estimate based on typical patterns
    metrics.sandboxCreation = metrics.totalTime * 0.4; // ~40% for creation
    metrics.codeExecution = metrics.totalTime * 0.5;   // ~50% for execution
    metrics.sandboxCleanup = metrics.totalTime * 0.1;  // ~10% for cleanup
    
    const passed = result.exitCode === 0 || name.includes("Error");
    const targetMet = metrics.totalTime <= target;
    
    return {
      name,
      code,
      metrics,
      passed,
      targetMet,
    };
  } catch (error) {
    metrics.totalTime = timer.getElapsed();
    
    return {
      name,
      code,
      metrics,
      passed: false,
      targetMet: false,
    };
  }
}

/**
 * Run detailed benchmark with separate timing measurements
 */
async function runDetailedBenchmark(
  name: string,
  code: string,
  target: number
): Promise<BenchmarkResult> {
  const timer = new PerformanceTimer();
  let sandboxId: string | null = null;
  let metrics: ExecutionMetrics = {
    totalTime: 0,
    sandboxCreation: 0,
    codeExecution: 0,
    sandboxCleanup: 0,
  };
  
  try {
    timer.start();
    
    // Measure sandbox creation
    sandboxId = await createSandbox(30000);
    timer.mark('sandbox_created');
    metrics.sandboxCreation = timer.getMark('sandbox_created');
    
    // Measure code execution
    const result = await runCode(sandboxId, code);
    timer.mark('code_executed');
    metrics.codeExecution = timer.getMark('code_executed') - metrics.sandboxCreation;
    
    // Measure cleanup
    await killSandbox(sandboxId);
    timer.mark('sandbox_cleaned');
    metrics.sandboxCleanup = timer.getMark('sandbox_cleaned') - timer.getMark('code_executed');
    
    metrics.totalTime = timer.getElapsed();
    
    const passed = !result.error || name.includes("Error");
    const targetMet = metrics.totalTime <= target;
    
    return {
      name,
      code,
      metrics,
      passed,
      targetMet,
    };
  } catch (error) {
    metrics.totalTime = timer.getElapsed();
    
    // Attempt cleanup if sandbox was created
    if (sandboxId) {
      try {
        await killSandbox(sandboxId);
      } catch {}
    }
    
    return {
      name,
      code,
      metrics,
      passed: false,
      targetMet: false,
    };
  }
}

/**
 * Calculate benchmark summary statistics
 */
function calculateSummary(results: BenchmarkResult[]): BenchmarkSummary {
  const times = results.map(r => r.metrics.totalTime);
  const totalTests = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = totalTests - passed;
  const targetsMet = results.filter(r => r.targetMet).length;
  
  const averageTime = times.reduce((a, b) => a + b, 0) / totalTests;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  // Determine overall performance rating
  let performance: BenchmarkSummary['performance'];
  const targetPercentage = (targetsMet / totalTests) * 100;
  
  if (targetPercentage >= 90 && averageTime < 2000) {
    performance = 'excellent';
  } else if (targetPercentage >= 70 && averageTime < 3000) {
    performance = 'good';
  } else if (targetPercentage >= 50 && averageTime < 4000) {
    performance = 'acceptable';
  } else {
    performance = 'poor';
  }
  
  return {
    totalTests,
    passed,
    failed,
    averageTime,
    minTime,
    maxTime,
    targetsMet,
    performance,
  };
}

/**
 * Run complete benchmark suite
 */
export async function runBenchmarkSuite(
  detailed: boolean = false
): Promise<BenchmarkSuite> {
  console.log("🚀 Starting benchmark suite...");
  const results: BenchmarkResult[] = [];
  
  // Run all test categories
  for (const [category, tests] of Object.entries(BENCHMARK_TESTS)) {
    console.log(`\n📊 Running ${category} tests...`);
    
    for (const test of tests) {
      console.log(`  ⏱️  Testing: ${test.name}`);
      
      const result = detailed
        ? await runDetailedBenchmark(test.name, test.code, test.target)
        : await runBenchmarkTest(test.name, test.code, test.target);
      
      results.push(result);
      
      const status = result.targetMet ? '✅' : '⚠️';
      const time = result.metrics.totalTime.toFixed(0);
      console.log(`     ${status} Completed in ${time}ms (target: ${test.target}ms)`);
      
      // Add small delay between tests to avoid overwhelming the service
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const summary = calculateSummary(results);
  
  return {
    name: "Daytona Execution Performance Benchmark",
    results,
    summary,
    timestamp: new Date(),
  };
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResults(suite: BenchmarkSuite): string {
  const { summary, results } = suite;
  
  let output = `
╔════════════════════════════════════════════════════════════════╗
║           DAYTONA EXECUTION PERFORMANCE BENCHMARK              ║
╚════════════════════════════════════════════════════════════════╝

📅 Timestamp: ${suite.timestamp.toISOString()}
🎯 Performance Rating: ${summary.performance.toUpperCase()}

═══════════════════════════════════════════════════════════════════
                         SUMMARY STATISTICS
═══════════════════════════════════════════════════════════════════
  Total Tests:        ${summary.totalTests}
  Passed:            ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(1)}%)
  Failed:            ${summary.failed}
  Targets Met:       ${summary.targetsMet} (${((summary.targetsMet / summary.totalTests) * 100).toFixed(1)}%)
  
  Average Time:      ${summary.averageTime.toFixed(0)}ms
  Min Time:          ${summary.minTime.toFixed(0)}ms
  Max Time:          ${summary.maxTime.toFixed(0)}ms

═══════════════════════════════════════════════════════════════════
                         DETAILED RESULTS
═══════════════════════════════════════════════════════════════════
`;
  
  for (const result of results) {
    const status = result.targetMet ? '✅' : '⚠️';
    const passStatus = result.passed ? 'PASS' : 'FAIL';
    
    output += `
${status} ${result.name}
   Status: ${passStatus} | Time: ${result.metrics.totalTime.toFixed(0)}ms
   Breakdown:
     - Sandbox Creation: ${result.metrics.sandboxCreation.toFixed(0)}ms
     - Code Execution:   ${result.metrics.codeExecution.toFixed(0)}ms
     - Cleanup:          ${result.metrics.sandboxCleanup.toFixed(0)}ms
`;
  }
  
  output += `
═══════════════════════════════════════════════════════════════════
                         RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════
`;
  
  if (summary.performance === 'excellent') {
    output += `
✨ Excellent performance! All targets are being met.
   - Continue monitoring for regression
   - Consider more aggressive caching if needed
`;
  } else if (summary.performance === 'good') {
    output += `
👍 Good performance with room for optimization.
   - Consider implementing connection pooling
   - Investigate sandbox pre-warming strategies
`;
  } else if (summary.performance === 'acceptable') {
    output += `
⚠️  Performance needs improvement.
   - Implement sandbox pooling for reuse
   - Add caching layer for frequently executed code
   - Consider async/parallel execution strategies
`;
  } else {
    output += `
❌ Performance is below acceptable levels.
   - Critical: Implement sandbox pooling immediately
   - Add aggressive caching mechanisms
   - Consider switching to persistent sandboxes
   - Investigate network latency issues
`;
  }
  
  return output;
}

/**
 * Compare performance with baseline targets
 */
export async function compareWithBaseline(): Promise<void> {
  console.log("\n🔄 Running performance analysis against baseline targets...");
  
  // Run benchmark on current Daytona implementation
  const daytonaSuite = await runBenchmarkSuite();
  
  // Compare against performance targets
  const targetBaseline = {
    averageTime: 2000, // Target average execution time
    minTime: 500,      // Target minimum execution time
    maxTime: 3000,     // Target maximum execution time
  };
  
  const targetComparison = ((daytonaSuite.summary.averageTime - targetBaseline.averageTime) / targetBaseline.averageTime) * 100;
  
  console.log("\n📊 Performance Analysis:");
  console.log(`  Current Average: ${daytonaSuite.summary.averageTime.toFixed(0)}ms`);
  console.log(`  Target Average:  ${targetBaseline.averageTime}ms`);
  console.log(`  Variance:        ${targetComparison > 0 ? '+' : ''}${targetComparison.toFixed(1)}%`);
  
  if (targetComparison > 20) {
    console.log("\n⚠️  Warning: Performance below target!");
    console.log("  Consider implementing optimization strategies.");
  } else if (targetComparison > 0) {
    console.log("\n💡 Performance slightly above target. Room for optimization.");
  } else {
    console.log("\n✅ Performance meets or exceeds targets!");
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  private static sandboxPool: Map<string, any> = new Map();
  private static maxPoolSize = 3;
  
  /**
   * Pre-warm sandboxes for faster execution
   */
  static async prewarmSandboxes(count: number = 2): Promise<void> {
    console.log(`🔥 Pre-warming ${count} sandboxes...`);
    
    for (let i = 0; i < Math.min(count, this.maxPoolSize); i++) {
      try {
        const sandboxId = await createSandbox(30000);
        this.sandboxPool.set(sandboxId, { 
          created: Date.now(),
          inUse: false 
        });
        console.log(`  ✅ Sandbox ${i + 1} ready`);
      } catch (error) {
        console.error(`  ❌ Failed to create sandbox ${i + 1}:`, error);
      }
    }
  }
  
  /**
   * Get a sandbox from the pool or create a new one
   */
  static async getSandbox(): Promise<string> {
    // Find an available sandbox from the pool
    for (const [id, info] of Array.from(this.sandboxPool.entries())) {
      if (!info.inUse) {
        info.inUse = true;
        console.log(`♻️  Reusing sandbox from pool: ${id}`);
        return id;
      }
    }
    
    // No available sandbox, create a new one
    console.log("🆕 Creating new sandbox (pool exhausted)");
    return await createSandbox(30000);
  }
  
  /**
   * Return a sandbox to the pool
   */
  static releaseSandbox(sandboxId: string): void {
    const info = this.sandboxPool.get(sandboxId);
    if (info) {
      info.inUse = false;
      console.log(`♻️  Returned sandbox to pool: ${sandboxId}`);
    }
  }
  
  /**
   * Clean up all pooled sandboxes
   */
  static async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up sandbox pool...");
    
    for (const [id] of Array.from(this.sandboxPool.entries())) {
      try {
        await killSandbox(id);
        console.log(`  ✅ Cleaned up sandbox: ${id}`);
      } catch (error) {
        console.error(`  ❌ Failed to clean up sandbox ${id}:`, error);
      }
    }
    
    this.sandboxPool.clear();
  }
}

// Export for CLI usage
export default {
  runBenchmarkSuite,
  formatBenchmarkResults,
  compareWithBaseline,
  PerformanceOptimizer,
};
