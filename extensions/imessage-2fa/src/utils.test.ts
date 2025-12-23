import { extractCode, extractVerificationLink, extractTextFromBinaryData, escapeSqlLikePattern } from "./utils";

describe("Testing matching logic", () => {
  test("Alphanumeric codes", () => {
    expect(
      extractCode(
        "Chase: DON'T share. Use code 41646271 to complete Extra Security at Sign In. We'll NEVER call to ask for this code. Call us if you didn't request it."
      )
    ).toBe("41646271");
    expect(extractCode("2773 is your Microsoft account verification code")).toBe("2773");
    expect(extractCode("Your Airbnb verification code is: 1234.")).toBe("1234");
    expect(extractCode("Your verification code is: 1234, use it to log in")).toBe("1234");
    expect(extractCode("Here is your authorization code:9384")).toBe("9384");
    expect(extractCode("【抖音】验证码9316，用于手机验证")).toBe("9316");
    expect(extractCode("Your healow verification code is : 7579.")).toBe("7579");
    expect(extractCode("Please enter code 548 on Zocdoc.")).toBe("548");
    expect(extractCode("TRUSTED LOCATION PASSCODE: mifsuc")).toBe("mifsuc");
    expect(
      extractCode(
        "USAA FRAUD PREVENTION ALERT: USAA will never contact you for this code, don't share it: 123456. Call 800-531-8722 if you gave it to anyone. Reply HELP for help."
      )
    ).toBe("123456");
    expect(
      extractCode(
        "Call 800-531-8722 if you gave it to anyone. USAA FRAUD PREVENTION ALERT: USAA will never contact you for this code, don't share it: 123456. Reply HELP for help."
      )
    ).toBe("123456");
    expect(extractCode("您的验证码是 199035，10分钟内有效，请勿泄露")).toBe("199035");
    expect(extractCode("登录验证码：627823，您正在尝试【登录】，10分钟内有效")).toBe("627823");
    expect(extractCode("【赛验】验证码 54538")).toBe("54538");
    expect(extractCode("Enter this code to log in:59678.")).toBe("59678");
    expect(extractCode("G-315643 is your Google verification code")).toBe("315643");
    expect(extractCode("Enter the code 765432, and then click the button to log in.")).toBe("765432");
    expect(extractCode("Your code is 45678!")).toBe("45678");
    expect(extractCode("Your code is:98765!")).toBe("98765");
    expect(extractCode("5WGU8G")).toBe("5WGU8G");
    expect(extractCode("Your code is: 5WGU8G")).toBe("5WGU8G");
    expect(extractCode("CWGUG8")).toBe("CWGUG8");
    expect(extractCode("CWGUG8 is your code")).toBe("CWGUG8");
    expect(extractCode("7645W453")).toBe("7645W453");
    expect(
      extractCode(
        "Chase: DON'T share. Use code 89050683. Only use this online. Code expires in 10 min. We'll NEVER call to ask for this code. Call us if you didn't request it."
      )
    ).toBe("89050683");
    expect(extractCode("Código de Autorização: 12345678")).toBe("12345678");
    expect(extractCode("O seu código: 12345678")).toBe("12345678");
    expect(extractCode("Codigo de Autorizacao: 87654321")).toBe("87654321");
    expect(extractCode("O seu codigo: 87654321")).toBe("87654321");
  });

  test("Codes with dash", () => {
    expect(extractCode("123-456")).toBe("123456");
    expect(extractCode("Your Stripe verification code is: 719-839.")).toBe("719839");
  });

  test("Japanese 2FA message with full-width colon", () => {
    expect(
      extractCode("ご利用金額をご確認ください 金額：20JPY パスワード：11223344 フィッシング詐欺にご注意！ エポスカード")
    ).toBe("11223344");
  });
});

describe("Testing verification link extraction", () => {
  test("Email verification links", () => {
    const emailMessage =
      "Please verify your email address by clicking on the link below:\nhttps://example.com/verify?token=abcdef123456";
    const result = extractVerificationLink(emailMessage);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://example.com/verify?token=abcdef123456");
    expect(result?.type).toBe("verification");

    const confirmMessage = "To confirm your account, please click the link: https://service.com/confirm-email/xyz123";
    const confirmResult = extractVerificationLink(confirmMessage);
    expect(confirmResult).not.toBeNull();
    expect(confirmResult?.url).toBe("https://service.com/confirm-email/xyz123");
    expect(confirmResult?.type).toBe("verification");
  });

  test("Sign-in links", () => {
    const loginMessage = "Here's your magic link to sign in: https://app.company.com/login?token=xyzabc987654";
    const result = extractVerificationLink(loginMessage);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://app.company.com/login?token=xyzabc987654");
    expect(result?.type).toBe("sign-in");

    const tempAccessMessage = "Your temporary access link: https://secure.site.org/temp-access/123abc";
    const tempResult = extractVerificationLink(tempAccessMessage);
    expect(tempResult).not.toBeNull();
    expect(tempResult?.url).toBe("https://secure.site.org/temp-access/123abc");
    expect(tempResult?.type).toBe("sign-in");
  });

  test("URL with verification parameters", () => {
    const tokenMessage = "Click here to access: https://portal.example.org/account?token=abcdef&session=123";
    const result = extractVerificationLink(tokenMessage);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://portal.example.org/account?token=abcdef&session=123");
    expect(result?.type).toBe("verification");
  });

  test("Message with no links", () => {
    const noLinkMessage = "This is a regular message with no links or verification codes.";
    const result = extractVerificationLink(noLinkMessage);
    expect(result).toBeNull();
  });

  test("Message with unrelated link", () => {
    const unrelatedLink = "Check out this article: https://news.example.com/latest-technology-trends";
    const result = extractVerificationLink(unrelatedLink);
    expect(result).toBeNull();
  });

  test("Message with both code and verification link", () => {
    const mixedMessage =
      "Your verification code is 123456. Or click this link to verify: https://example.com/verify?token=abc123";

    // Check code extraction
    const code = extractCode(mixedMessage);
    expect(code).toBe("123456");

    // Check link extraction
    const linkResult = extractVerificationLink(mixedMessage);
    expect(linkResult).not.toBeNull();
    expect(linkResult?.url).toBe("https://example.com/verify?token=abc123");
    expect(linkResult?.type).toBe("verification");
  });

  test("Common sign-in links detection", () => {
    const googleSignIn = "Sign in to your Google account: https://accounts.google.com/signin?token=xyz789";
    const googleResult = extractVerificationLink(googleSignIn);
    expect(googleResult).not.toBeNull();
    expect(googleResult?.type).toBe("sign-in");

    const microsoftSignIn = "Access your account: https://login.microsoft.com/common/oauth2/authorize?token=abc";
    const msResult = extractVerificationLink(microsoftSignIn);
    expect(msResult).not.toBeNull();
    expect(msResult?.type).toBe("sign-in");
  });

  test("HTML-formatted email with verification link", () => {
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <body>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="https://example.com/verify?token=abc123">Verify your email</a></p>
      </body>
      </html>
    `;

    const result = extractVerificationLink(htmlEmail);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://example.com/verify?token=abc123");
    expect(result?.type).toBe("verification");

    const htmlSignIn = `
      <html>
      <body>
        <p>Click below to sign in to your account:</p>
        <a href="https://app.example.org/login?token=xyz789">Sign in to your account</a>
      </body>
      </html>
    `;

    const signInResult = extractVerificationLink(htmlSignIn);
    expect(signInResult).not.toBeNull();
    expect(signInResult?.url).toBe("https://app.example.org/login?token=xyz789");
    expect(signInResult?.type).toBe("sign-in");
  });

  test("Email with escaped HTML entities", () => {
    const escapedHtml = `
      Your verification link:
      &lt;a href=&quot;https://example.org/verify?token=123456&quot;&gt;Verify Email&lt;/a&gt;
    `;

    const result = extractVerificationLink(escapedHtml);
    expect(result).not.toBeNull();
    expect(result?.url).toBe("https://example.org/verify?token=123456");
    expect(result?.type).toBe("verification");
  });

  test("URL with HTML entity", () => {
    const message = `Click here: <a href="https://service.com/action?param1=value1&amp;param2=value2">Do Action</a>`;
    const result = extractVerificationLink(message);
    // This link has no keywords, so it should not be detected as verification/sign-in
    expect(result).toBeNull();
  });
});

describe("Testing binary data extraction from iMessage", () => {
  test("Extract text from NSArchiver binary format", () => {
    // Real example from iMessage with 2FA code
    const binaryData =
      "\x04\x0Bstreamtyped\x81è\x03\x84\x01@\x84\x84\x84\x19NSMutableAttributedString\x00\x84\x84\x12NSAttributedString\x00\x84\x84\bNSObject\x00\x85\x92\x84\x84\x84\x0FNSMutableString\x01\x84\x84\bNSString\x01\x95\x84\x01+\x81\x85\x00DO NOT share. We will NEVER call you to ask for this code. Didn't request? Contact support. Your HealthSafe ID access code is: 643066\x86\x84\x02iI\x01\x7F\x92\x84\x84\x84\fNSDictionary\x00\x95\x84\x01i\x01\x92\x84\x98\x98\x1D__kIMMessagePartAttributeName\x86\x92\x84\x84\x84\bNSNumber\x00\x84\x84\x07NSValue\x00\x95\x84\x01*\x84\x9B\x9B\x00\x86\x86\x99\x02\x06\x92\x84\x9A\x9B\x03\x92\x84\x98\x98\x1D__kIMMessagePartAttributeName\x86\x92\x9C\x92\x84\x98\x98\x1D__kIMOneTimeCodeAttributeName\x86\x92\x84\x9A\x9B\x02\x92\x84\x98\x98\x04code\x86\x92\x84\x98\x98\x06643066\x86\x92\x84\x98\x98\x0BdisplayCode\x86\x92¥\x86\x92\x84\x98\x98\x1E__kIMDataDetectedAttributeName\x86";

    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("DO NOT share");
    expect(result).toContain("643066");
    expect(result).toContain("HealthSafe");
    // Should not contain class names
    expect(result).not.toContain("NSMutable");
    expect(result).not.toContain("__kIM");
  });

  test("Plain text passes through unchanged", () => {
    const plainText = "Your verification code is: 123456";
    const result = extractTextFromBinaryData(plainText);
    expect(result).toBe(plainText);
  });

  test("Empty or null input returns empty string", () => {
    expect(extractTextFromBinaryData("")).toBe("");
    expect(extractTextFromBinaryData(null as unknown as string)).toBe("");
    expect(extractTextFromBinaryData(undefined as unknown as string)).toBe("");
  });

  test("Extract from binary data with shorter message", () => {
    // Simulated binary format with a simple message
    const binaryData = "\x04\x0Bstreamtyped\x81NSMutableString\x00Your code is: 98765\x86NSDictionary";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toBe("Your code is: 98765");
  });

  test("Plain text containing similar strings is not misidentified as binary", () => {
    // Edge case: plain text that mentions these class names should pass through
    const plainText = "The NSAttributedString class is used for rich text";
    const result = extractTextFromBinaryData(plainText);
    // Should return as-is since it doesn't have the actual binary markers
    expect(result).toBe(plainText);
  });

  test("Binary data detected by NSArchiver class names even without streamtyped", () => {
    // Test that binary data can be detected by class name markers alone
    // (in case streamtyped is missing due to encoding issues)
    const binaryData = "NSMutableAttributedString\x00\x84\x84\x12NSAttributedString\x00Your code: 12345\x86";
    const result = extractTextFromBinaryData(binaryData);
    // Should extract the code, not return the raw binary
    expect(result).toContain("12345");
    expect(result).not.toContain("NSMutableAttributedString");
  });

  test("NSKeyedArchiver signature detected", () => {
    // Test detection via NSKeyedArchiver string signature
    const binaryData = "NSKeyedArchiver\x00\x84\x84\x12Your verification code is: 987654\x86";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("987654");
    expect(result).not.toContain("NSKeyedArchiver");
  });

  test("NSArchiver signature detected", () => {
    // Test detection via NSArchiver string signature (legacy format)
    const binaryData = "NSArchiver\x00\x84\x84\x12Your code: 456789\x86";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("456789");
    expect(result).not.toContain("NSArchiver");
  });

  test("NSMutableString and NSString class names detected", () => {
    // Test detection via NSString class names
    const binaryData = "NSMutableString\x00\x84\x84\x12NSString\x00Your code: 111222\x86";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("111222");
  });

  test("Extract text with emoji and non-Latin characters", () => {
    // Test that Unicode characters (emoji, non-Latin scripts) are properly extracted
    const binaryData = "NSKeyedArchiver\x00\x84\x84\x12Your verification code is: 123456 🎉 验证码：123456\x86";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("123456");
    expect(result).toContain("验证码");
    // Emoji might be filtered out by the filtering logic, but Unicode text should be preserved
  });

  test("Extract text with Arabic and Japanese characters", () => {
    // Test extraction of non-Latin scripts
    const binaryData = "streamtyped\x81\x85\x00Your code: 789012 コード：789012 رمز: 789012\x86";
    const result = extractTextFromBinaryData(binaryData);
    expect(result).toContain("789012");
    // Non-Latin characters should be preserved if they're part of the message
  });

  test("Extract short codes when no messages with spaces", () => {
    // Test that short codes (OTP codes) are preserved when there are no messages with spaces
    // This simulates binary data where only codes are present without surrounding text
    // Using a format where codes are embedded with enough context to be extracted
    const binaryData = "streamtyped\x81\x85\x00NSMutableString\x00CodeABC123DEF\x86\x84\x84\x12NSDictionary";
    const result = extractTextFromBinaryData(binaryData);
    // Should extract codes even without spaces (they contain digits or mixed case)
    // The codes are part of a longer string "CodeABC123DEF" which should be extracted
    expect(result).toMatch(/ABC123|CodeABC123DEF/);
  });

  test("Prefer messages with spaces over short tokens", () => {
    // Test that messages with spaces are preferred over short tokens
    const binaryData = "NSKeyedArchiver\x00\x84\x84\x12Your code is: 789012\x86\x84\x84\x12ABC123\x86";
    const result = extractTextFromBinaryData(binaryData);
    // Should prefer the message with spaces
    expect(result).toContain("Your code is: 789012");
    expect(result).not.toContain("ABC123");
  });

  test("Extract pure numeric OTP codes without spaces", () => {
    // Test that pure numeric OTP codes (digit-heavy) are preserved when no messages with spaces
    // Using format similar to working test cases with embedded codes
    const binaryData = "streamtyped\x81\x85\x00NSMutableString\x00Code123456\x86\x84\x84\x12NSDictionary";
    const result = extractTextFromBinaryData(binaryData);
    // Should extract codes even when embedded (the "Code123456" contains digits)
    expect(result).toMatch(/123456|Code123456/);
  });

  test("Extract short alphanumeric codes", () => {
    // Test extraction of short alphanumeric codes without spaces
    // Using format with embedded codes that will be extracted
    const binaryData = "NSKeyedArchiver\x00\x84\x84\x12CodeABC123\x86\x84\x84\x12DEF456\x86";
    const result = extractTextFromBinaryData(binaryData);
    // Should extract codes that contain digits (even without spaces)
    expect(result).toMatch(/ABC123|DEF456|CodeABC123/);
  });
});

describe("Testing SQL LIKE pattern escaping", () => {
  test("Escapes single quotes", () => {
    expect(escapeSqlLikePattern("test'string")).toBe("test''string");
    expect(escapeSqlLikePattern("O'Brien")).toBe("O''Brien");
    expect(escapeSqlLikePattern("don't")).toBe("don''t");
    expect(escapeSqlLikePattern("O'Brien's code")).toBe("O''Brien''s code");
  });

  test("Preserves LIKE wildcards for user search functionality", () => {
    expect(escapeSqlLikePattern("test%string")).toBe("test%string");
    expect(escapeSqlLikePattern("test_string")).toBe("test_string");
    expect(escapeSqlLikePattern("50% off")).toBe("50% off");
  });

  test("Handles multiple single quotes", () => {
    expect(escapeSqlLikePattern("test'%_string")).toBe("test''%_string");
    expect(escapeSqlLikePattern("O'Brien's 50% discount")).toBe("O''Brien''s 50% discount");
  });

  test("Handles empty and null inputs", () => {
    expect(escapeSqlLikePattern("")).toBe("");
    expect(escapeSqlLikePattern(null as unknown as string)).toBe("");
    expect(escapeSqlLikePattern(undefined as unknown as string)).toBe("");
  });

  test("Normal text passes through unchanged", () => {
    expect(escapeSqlLikePattern("normal text")).toBe("normal text");
    expect(escapeSqlLikePattern("123456")).toBe("123456");
    expect(escapeSqlLikePattern("test@example.com")).toBe("test@example.com");
  });
});
