import { JsonFragment } from 'ethers';

export function isSignature(signature: string): boolean {
  const signaturePattern = new RegExp('^[0-9a-f]{8}$');
  return signaturePattern.test(signature);
}

export function isData(data: string): boolean {
  const dataPattern = new RegExp('^[0-9a-f]*$');
  return dataPattern.test(data);
}

export function isEventTopic(topic: string): boolean {
  const topicPattern = new RegExp('^[0-9a-f]{64}$');
  return topicPattern.test(topic);
}

export function normalizeHex(hex: string): string {
  if (hex.startsWith('0x')) {
    return hex.substring(2);
  }
  return hex;
}

export function isAbi(value: string): boolean {
  let json: JsonFragment[] = [];
  try {
    json = JSON.parse(value);
  } catch {
    return false;
  }
  return json.every((item) => {
    const validType = [
      'event',
      'fallback',
      'receive',
      'constructor',
      'function',
    ].includes(item.type || '');
    const inputs = item.inputs || [];
    const validInputs = inputs.every((input) => !!input.type);
    const outputs = item.outputs || [];
    const validOutputs = outputs.every((output) => !!output.type);
    return validType && validInputs && validOutputs;
  });
}
