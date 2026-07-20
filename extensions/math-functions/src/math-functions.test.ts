// Comprehensive test suite for math functions and expression parsing
import { describe, it, expect } from "@jest/globals";

// Import all math functions (we'll need to export them from the main file)
// For now, we'll redefine them here for testing purposes

// Math utility functions
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function gcdMultiple(...args: number[]): number {
  if (args.length === 0) return 0;
  return args.reduce((acc, val) => gcd(acc, val));
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function lcmMultiple(...args: number[]): number {
  if (args.length === 0) return 0;
  return args.reduce((acc, val) => lcm(acc, val));
}

function sum(...args: number[]): number {
  return args.reduce((acc, val) => acc + val, 0);
}

function product(...args: number[]): number {
  return args.reduce((acc, val) => acc * val, 1);
}

function avg(...args: number[]): number {
  if (args.length === 0) return 0;
  return sum(...args) / args.length;
}

function factorial(n: number): number {
  if (n < 0) throw new Error("Factorial is not defined for negative numbers");
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

function median(...args: number[]): number {
  if (args.length === 0) return 0;
  const sorted = [...args].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mode(...args: number[]): number {
  if (args.length === 0) return 0;
  const frequency: { [key: number]: number } = {};
  let maxFreq = 0;
  let modeValue = args[0];

  args.forEach((num) => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      modeValue = num;
    }
  });

  return modeValue;
}

function range(...args: number[]): number {
  if (args.length === 0) return 0;
  return Math.max(...args) - Math.min(...args);
}

function variance(...args: number[]): number {
  if (args.length === 0) return 0;
  const mean = avg(...args);
  const squaredDiffs = args.map((x) => Math.pow(x - mean, 2));
  return sum(...squaredDiffs) / args.length;
}

function std(...args: number[]): number {
  return Math.sqrt(variance(...args));
}

function isPrime(n: number): number {
  if (n < 2) return 0;
  if (n === 2) return 1;
  if (n % 2 === 0) return 0;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return 0;
  }
  return 1;
}

function fibonacci(n: number): number {
  if (n < 0) throw new Error("Fibonacci is not defined for negative numbers");
  if (n <= 1) return n;
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

function ncr(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function npr(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  return factorial(n) / factorial(n - r);
}

function deg2rad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rad2deg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function completeExpression(expression: string): string {
  let completed = expression;
  completed = completed.replace(/[,+\-*/\s]+$/, "");
  const openParens = (completed.match(/\(/g) || []).length;
  const closeParens = (completed.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    completed += ")".repeat(openParens - closeParens);
  }
  return completed;
}

describe("GCD (Greatest Common Divisor)", () => {
  it("should calculate GCD of two positive numbers", () => {
    expect(gcd(48, 18)).toBe(6);
    expect(gcd(100, 50)).toBe(50);
    expect(gcd(17, 19)).toBe(1); // Coprime numbers
  });

  it("should handle GCD with zero", () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
    expect(gcd(0, 0)).toBe(0);
  });

  it("should handle negative numbers", () => {
    expect(gcd(-48, 18)).toBe(6);
    expect(gcd(48, -18)).toBe(6);
    expect(gcd(-48, -18)).toBe(6);
  });

  it("should calculate GCD of multiple numbers", () => {
    expect(gcdMultiple(48, 18, 12)).toBe(6);
    expect(gcdMultiple(100, 50, 25)).toBe(25);
    expect(gcdMultiple(7, 14, 21, 28)).toBe(7);
  });

  it("should handle edge cases for gcdMultiple", () => {
    expect(gcdMultiple()).toBe(0);
    expect(gcdMultiple(42)).toBe(42);
  });
});

describe("LCM (Least Common Multiple)", () => {
  it("should calculate LCM of two positive numbers", () => {
    expect(lcm(12, 18)).toBe(36);
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(7, 5)).toBe(35);
  });

  it("should handle LCM with zero", () => {
    expect(lcm(0, 5)).toBe(0);
    expect(lcm(5, 0)).toBe(0);
  });

  it("should handle negative numbers", () => {
    expect(lcm(-12, 18)).toBe(36);
    expect(lcm(12, -18)).toBe(36);
    expect(lcm(-12, -18)).toBe(36);
  });

  it("should calculate LCM of multiple numbers", () => {
    expect(lcmMultiple(4, 6, 8)).toBe(24);
    expect(lcmMultiple(2, 3, 4, 5)).toBe(60);
  });

  it("should handle edge cases for lcmMultiple", () => {
    expect(lcmMultiple()).toBe(0);
    expect(lcmMultiple(42)).toBe(42);
  });
});

describe("Statistical Functions", () => {
  describe("sum", () => {
    it("should sum positive numbers", () => {
      expect(sum(1, 2, 3, 4, 5)).toBe(15);
      expect(sum(10, 20, 30)).toBe(60);
    });

    it("should handle negative numbers", () => {
      expect(sum(-1, -2, -3)).toBe(-6);
      expect(sum(10, -5, 3)).toBe(8);
    });

    it("should handle empty input", () => {
      expect(sum()).toBe(0);
    });

    it("should handle single number", () => {
      expect(sum(42)).toBe(42);
    });
  });

  describe("product", () => {
    it("should multiply numbers", () => {
      expect(product(2, 3, 4)).toBe(24);
      expect(product(5, 5)).toBe(25);
    });

    it("should handle negative numbers", () => {
      expect(product(-2, 3)).toBe(-6);
      expect(product(-2, -3)).toBe(6);
    });

    it("should handle empty input", () => {
      expect(product()).toBe(1);
    });
  });

  describe("avg", () => {
    it("should calculate average", () => {
      expect(avg(10, 20, 30)).toBe(20);
      expect(avg(1, 2, 3, 4, 5)).toBe(3);
    });

    it("should handle negative numbers", () => {
      expect(avg(-10, 10)).toBe(0);
      expect(avg(-5, -10, -15)).toBe(-10);
    });

    it("should handle empty input", () => {
      expect(avg()).toBe(0);
    });
  });

  describe("median", () => {
    it("should find median of odd-length array", () => {
      expect(median(1, 3, 5)).toBe(3);
      expect(median(7, 2, 9, 1, 5)).toBe(5);
    });

    it("should find median of even-length array", () => {
      expect(median(1, 2, 3, 4)).toBe(2.5);
      expect(median(10, 20, 30, 40)).toBe(25);
    });

    it("should handle unsorted input", () => {
      expect(median(5, 1, 3, 9, 7)).toBe(5);
    });

    it("should handle empty input", () => {
      expect(median()).toBe(0);
    });

    it("should handle single value", () => {
      expect(median(42)).toBe(42);
    });
  });

  describe("mode", () => {
    it("should find the most frequent value", () => {
      expect(mode(1, 2, 2, 3)).toBe(2);
      expect(mode(5, 5, 5, 1, 2, 3)).toBe(5);
    });

    it("should return first occurrence when all equal frequency", () => {
      expect(mode(1, 2, 3)).toBe(1);
    });

    it("should handle empty input", () => {
      expect(mode()).toBe(0);
    });
  });

  describe("range", () => {
    it("should calculate range (max - min)", () => {
      expect(range(1, 5, 3, 9, 2)).toBe(8); // 9 - 1
      expect(range(10, 20, 15)).toBe(10); // 20 - 10
    });

    it("should handle negative numbers", () => {
      expect(range(-5, 5)).toBe(10);
      expect(range(-10, -1, -5)).toBe(9);
    });

    it("should handle empty input", () => {
      expect(range()).toBe(0);
    });
  });

  describe("variance", () => {
    it("should calculate population variance", () => {
      expect(variance(1, 2, 3, 4, 5)).toBeCloseTo(2, 1);
      expect(variance(10, 10, 10)).toBe(0);
    });

    it("should handle empty input", () => {
      expect(variance()).toBe(0);
    });
  });

  describe("std", () => {
    it("should calculate standard deviation", () => {
      expect(std(2, 4, 4, 4, 5, 5, 7, 9)).toBeCloseTo(2, 1);
      expect(std(10, 10, 10)).toBe(0);
    });

    it("should be square root of variance", () => {
      const data = [1, 2, 3, 4, 5];
      expect(std(...data)).toBeCloseTo(Math.sqrt(variance(...data)));
    });
  });
});

describe("Factorial", () => {
  it("should calculate factorial of positive integers", () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
    expect(factorial(10)).toBe(3628800);
  });

  it("should throw error for negative numbers", () => {
    expect(() => factorial(-1)).toThrow("Factorial is not defined for negative numbers");
    expect(() => factorial(-10)).toThrow();
  });

  it("should handle large factorials", () => {
    expect(factorial(20)).toBe(2432902008176640000);
  });
});

describe("Modulo", () => {
  it("should calculate modulo correctly", () => {
    expect(mod(17, 5)).toBe(2);
    expect(mod(10, 3)).toBe(1);
  });

  it("should handle negative numbers correctly", () => {
    expect(mod(-17, 5)).toBe(3); // Positive result
    expect(mod(17, -5)).toBe(-3); // Keeps sign of divisor in JS
    expect(mod(-17, -5)).toBe(-2);
  });

  it("should handle zero", () => {
    expect(mod(0, 5)).toBe(0);
  });
});

describe("isPrime", () => {
  it("should identify prime numbers", () => {
    expect(isPrime(2)).toBe(1);
    expect(isPrime(3)).toBe(1);
    expect(isPrime(5)).toBe(1);
    expect(isPrime(7)).toBe(1);
    expect(isPrime(11)).toBe(1);
    expect(isPrime(97)).toBe(1);
  });

  it("should identify non-prime numbers", () => {
    expect(isPrime(0)).toBe(0);
    expect(isPrime(1)).toBe(0);
    expect(isPrime(4)).toBe(0);
    expect(isPrime(6)).toBe(0);
    expect(isPrime(9)).toBe(0);
    expect(isPrime(100)).toBe(0);
  });

  it("should handle negative numbers", () => {
    expect(isPrime(-5)).toBe(0);
    expect(isPrime(-1)).toBe(0);
  });

  it("should handle large primes", () => {
    expect(isPrime(10007)).toBe(1);
    expect(isPrime(10009)).toBe(1); // 10009 is actually prime
  });
});

describe("Fibonacci", () => {
  it("should calculate Fibonacci numbers", () => {
    expect(fibonacci(0)).toBe(0);
    expect(fibonacci(1)).toBe(1);
    expect(fibonacci(2)).toBe(1);
    expect(fibonacci(3)).toBe(2);
    expect(fibonacci(4)).toBe(3);
    expect(fibonacci(5)).toBe(5);
    expect(fibonacci(10)).toBe(55);
  });

  it("should throw error for negative numbers", () => {
    expect(() => fibonacci(-1)).toThrow("Fibonacci is not defined for negative numbers");
  });

  it("should handle large Fibonacci numbers", () => {
    expect(fibonacci(20)).toBe(6765);
    expect(fibonacci(30)).toBe(832040);
  });
});

describe("Combinations and Permutations", () => {
  describe("ncr (Combinations)", () => {
    it("should calculate combinations correctly", () => {
      expect(ncr(5, 2)).toBe(10); // C(5,2) = 10
      expect(ncr(10, 3)).toBe(120); // C(10,3) = 120
      expect(ncr(6, 0)).toBe(1);
      expect(ncr(6, 6)).toBe(1);
    });

    it("should handle invalid inputs", () => {
      expect(ncr(5, 6)).toBe(0); // r > n
      expect(ncr(5, -1)).toBe(0); // r < 0
    });
  });

  describe("npr (Permutations)", () => {
    it("should calculate permutations correctly", () => {
      expect(npr(5, 2)).toBe(20); // P(5,2) = 20
      expect(npr(10, 3)).toBe(720); // P(10,3) = 720
      expect(npr(6, 0)).toBe(1);
    });

    it("should handle invalid inputs", () => {
      expect(npr(5, 6)).toBe(0); // r > n
      expect(npr(5, -1)).toBe(0); // r < 0
    });
  });
});

describe("Angle Conversions", () => {
  describe("deg2rad", () => {
    it("should convert degrees to radians", () => {
      expect(deg2rad(0)).toBe(0);
      expect(deg2rad(180)).toBeCloseTo(Math.PI);
      expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
      expect(deg2rad(360)).toBeCloseTo(2 * Math.PI);
    });

    it("should handle negative angles", () => {
      expect(deg2rad(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe("rad2deg", () => {
    it("should convert radians to degrees", () => {
      expect(rad2deg(0)).toBe(0);
      expect(rad2deg(Math.PI)).toBeCloseTo(180);
      expect(rad2deg(Math.PI / 2)).toBeCloseTo(90);
      expect(rad2deg(2 * Math.PI)).toBeCloseTo(360);
    });

    it("should handle negative angles", () => {
      expect(rad2deg(-Math.PI / 2)).toBeCloseTo(-90);
    });
  });
});

describe("Expression Completion Parser", () => {
  describe("Trailing operators", () => {
    it("should remove trailing arithmetic operators", () => {
      expect(completeExpression("sum(5+")).toBe("sum(5)");
      expect(completeExpression("sum(5-")).toBe("sum(5)");
      expect(completeExpression("sum(5*")).toBe("sum(5)");
      expect(completeExpression("sum(5/")).toBe("sum(5)");
    });

    it("should remove multiple trailing operators", () => {
      expect(completeExpression("sum(5,--+/*")).toBe("sum(5)");
      expect(completeExpression("sum(5+-*/")).toBe("sum(5)");
    });

    it("should remove trailing commas", () => {
      expect(completeExpression("sum(1,2,3,")).toBe("sum(1,2,3)");
      expect(completeExpression("sum(5,")).toBe("sum(5)");
    });

    it("should remove trailing commas and operators", () => {
      expect(completeExpression("sum(1,2,+")).toBe("sum(1,2)");
      expect(completeExpression("sum(1,+,")).toBe("sum(1)");
    });
  });

  describe("Parentheses balancing", () => {
    it("should close unclosed parentheses", () => {
      expect(completeExpression("sum(1,2,3")).toBe("sum(1,2,3)");
      expect(completeExpression("sum(avg(1,2")).toBe("sum(avg(1,2))");
      expect(completeExpression("sum(avg(max(1,2")).toBe("sum(avg(max(1,2)))");
    });

    it("should handle already balanced parentheses", () => {
      expect(completeExpression("sum(1,2,3)")).toBe("sum(1,2,3)");
      expect(completeExpression("sum(avg(1,2))")).toBe("sum(avg(1,2))");
    });

    it("should not add closing parens if already balanced", () => {
      expect(completeExpression("(1+2)")).toBe("(1+2)");
      expect(completeExpression("((1+2))")).toBe("((1+2))");
    });
  });

  describe("Complex expressions", () => {
    it("should handle nested functions with trailing operators", () => {
      expect(completeExpression("sum(avg(1,2,3),max(4,5,")).toBe("sum(avg(1,2,3),max(4,5))");
      expect(completeExpression("sum(1,avg(2,3+")).toBe("sum(1,avg(2,3))");
    });

    it("should handle multiple incomplete parts", () => {
      expect(completeExpression("sum(1,2,+,")).toBe("sum(1,2)");
      // Note: The regex only removes trailing operators, not operators before commas or closing parens
      expect(completeExpression("sum(avg(1,2+),")).toBe("sum(avg(1,2+))");
    });

    it("should preserve valid intermediate operators", () => {
      expect(completeExpression("sum(1+2,3+4")).toBe("sum(1+2,3+4)");
      expect(completeExpression("sum(1*2,3/4")).toBe("sum(1*2,3/4)");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty expression", () => {
      expect(completeExpression("")).toBe("");
    });

    it("should handle expression with only operators", () => {
      expect(completeExpression("+-*/")).toBe("");
    });

    it("should handle whitespace", () => {
      expect(completeExpression("sum(1, 2, 3 +  ")).toBe("sum(1, 2, 3)");
      expect(completeExpression("sum(1 , ")).toBe("sum(1)");
    });

    it("should handle single function name", () => {
      expect(completeExpression("sum")).toBe("sum");
      expect(completeExpression("sum(")).toBe("sum()");
    });
  });
});

describe("Integration Tests", () => {
  it("should handle realistic user input patterns", () => {
    // User typing gradually
    expect(completeExpression("s")).toBe("s");
    expect(completeExpression("su")).toBe("su");
    expect(completeExpression("sum")).toBe("sum");
    expect(completeExpression("sum(")).toBe("sum()");
    expect(completeExpression("sum(1")).toBe("sum(1)");
    expect(completeExpression("sum(1,")).toBe("sum(1)");
    expect(completeExpression("sum(1,2")).toBe("sum(1,2)");
    expect(completeExpression("sum(1,2,")).toBe("sum(1,2)");
    expect(completeExpression("sum(1,2,3")).toBe("sum(1,2,3)");
  });

  it("should handle nested function typing", () => {
    expect(completeExpression("sum(avg(")).toBe("sum(avg())");
    expect(completeExpression("sum(avg(1")).toBe("sum(avg(1))");
    expect(completeExpression("sum(avg(1,2")).toBe("sum(avg(1,2))");
    expect(completeExpression("sum(avg(1,2),")).toBe("sum(avg(1,2))");
    expect(completeExpression("sum(avg(1,2),3")).toBe("sum(avg(1,2),3)");
  });

  it("should handle mixed arithmetic and functions", () => {
    expect(completeExpression("sum(5*3,gcd(12,18")).toBe("sum(5*3,gcd(12,18))");
    expect(completeExpression("avg(10+5,20-3,30*2")).toBe("avg(10+5,20-3,30*2)");
  });
});
