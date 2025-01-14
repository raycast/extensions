import { extractCode } from "./utils";

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
