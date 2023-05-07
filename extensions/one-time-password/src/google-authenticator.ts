import protobuf from 'protobufjs';
import base32 from 'hi-base32';

const migrationPayload = `
syntax = "proto3";

message MigrationPayload {
  enum Algorithm {
    ALGO_INVALID = 0;
    ALGO_SHA1 = 1;
  }

  enum OtpType {
    OTP_INVALID = 0;
    OTP_HOTP = 1;
    OTP_TOTP = 2;
  }

  message OtpParameters {
    bytes secret = 1;
    string name = 2;
    string issuer = 3;
    Algorithm algorithm = 4;
    int32 digits = 5;
    OtpType type = 6;
    int64 counter = 7;
  }

  repeated OtpParameters otp_parameters = 1;
  int32 version = 2;
  int32 batch_size = 3;
  int32 batch_index = 4;
  int32 batch_id = 5;
}
`;

type OTPParameter = {
  secret: string;
  name: string;
  issuer: string;
  algorithm: number;
  digits: number;
  type: number;
};

type DecodedMessage = {
  otpParameters: OTPParameter[];
  version: number;
  batchSize: number;
  batchIndex: number;
};

function decodeMessage(buffer: Buffer) {
  const { root } = protobuf.parse(migrationPayload);
  const payload = root.lookupType('MigrationPayload');
  const err = payload.verify(buffer);
  if (err) throw err;

  const message = payload.decode(buffer);
  return payload.toObject(message) as DecodedMessage;
}

export function extractAccountsFromMigrationUrl(url: string) {
  const otpBuffer = Buffer.from(url.replace(/%3D/g, ''), 'base64');
  const { otpParameters } = decodeMessage(otpBuffer);

  return otpParameters.map((otpParameter) => {
    const secret = base32.encode(otpParameter.secret);
    const issuer = otpParameter.issuer || '';
    const name = otpParameter.name || '';

    return {
      secret,
      issuer,
      name,
    };
  });
}
