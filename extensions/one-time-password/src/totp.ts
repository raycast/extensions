import * as OTPAuth from 'otpauth';

export const TOKEN_TIME = 30;

export function generateToken(secret: string) {
  try {
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: TOKEN_TIME,
      secret,
    });

    return totp.generate();
  } catch (err) {
    throw new Error('Invalid secret');
  }
}
