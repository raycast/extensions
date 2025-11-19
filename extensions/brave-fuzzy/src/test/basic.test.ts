/**
 * Simple test to verify Jest setup
 */

describe("Jest Setup", () => {
  it("should run a basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle string operations", () => {
    const testString = "hello world";
    expect(testString.toUpperCase()).toBe("HELLO WORLD");
  });
});
