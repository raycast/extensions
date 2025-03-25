import protobuf from 'protobufjs';
import base32 from 'hi-base32';
import { environment } from '@raycast/api';

const { assetsPath } = environment;

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

async function decodeMessage(buffer: Buffer) {
  const root = await protobuf.load(`${assetsPath}/google-authenticator-migration.proto`);
  const payload = root.lookupType('MigrationPayload');
  const err = payload.verify(buffer);
  if (err) throw err;

  const message = payload.decode(buffer);
  return payload.toObject(message) as DecodedMessage;
}

export async function extractAccountsFromMigrationUrl(url: string) {
  const otpBuffer = Buffer.from(url.replace(/%3D/g, ''), 'base64');
  const { otpParameters } = await decodeMessage(otpBuffer);

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
