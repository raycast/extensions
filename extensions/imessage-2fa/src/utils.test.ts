import { extractCode, extractVerificationLink } from "./utils";

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
