// src/__tests__/formatLogContent.test.ts
import { formatLogContent, extractErrorMessage } from "../lib/utils/formatLogContent";

describe("formatLogContent", () => {
  it("should format valid JSON with pretty-print", () => {
    const json = '{"error":"NullPointerException","line":142}';
    const result = formatLogContent(json);

    expect(result).toContain("```json");
    expect(result).toContain("error");
    expect(result).toContain("NullPointerException");
    expect(result).toContain("```");
  });

  it("should format stack trace in code block", () => {
    const stackTrace = `Error: NullPointerException at PaymentService.processTransaction() at line 142
    at Object.<anonymous> (payment-service/app.js:42:5)
    at Module._load (internal/modules/cjs/loader.js:598:10)`;

    const result = formatLogContent(stackTrace);

    expect(result).toContain("```");
    expect(result).toContain("Error: NullPointerException");
    expect(result).toContain("at PaymentService.processTransaction");
  });

  it("should return plain text as-is", () => {
    const plainText = "Simple log message without special formatting";
    const result = formatLogContent(plainText);

    expect(result).toBe(plainText);
  });

  it("should detect Java stack traces", () => {
    const javaTrace = `java.lang.NullPointerException
    at com.example.PaymentService.processTransaction(PaymentService.java:142)
    at com.example.OrderService.checkout(OrderService.java:89)`;

    const result = formatLogContent(javaTrace);

    expect(result).toContain("```");
    expect(result).toContain("java.lang.NullPointerException");
  });

  it("should detect Python stack traces", () => {
    const pythonTrace = `Traceback (most recent call last):
  File "order_service.py", line 45, in process_order
    payment = payment_service.charge(amount)
  File "payment_service.py", line 142, in charge
    result = db.execute(query)`;

    const result = formatLogContent(pythonTrace);

    expect(result).toContain("```");
  });

  it("should handle empty content", () => {
    expect(formatLogContent("")).toBe("");
    expect(formatLogContent(null)).toBe(null);
  });
});

describe("extractErrorMessage", () => {
  it("should extract error message from stack trace", () => {
    const trace = `Error: NullPointerException at PaymentService.processTransaction()
    at line 142`;

    const result = extractErrorMessage(trace);

    expect(result).toContain("Error:");
    expect(result).toContain("NullPointerException");
  });

  it("should return null when no error message found", () => {
    const text = "Simple log message without error";
    const result = extractErrorMessage(text);

    expect(result).toBeNull();
  });

  it("should detect Exception in message", () => {
    const trace = `Exception: Connection refused to database server`;
    const result = extractErrorMessage(trace);

    expect(result).toContain("Exception:");
  });
});
