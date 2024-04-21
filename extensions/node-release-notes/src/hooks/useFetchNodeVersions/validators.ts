import type { ResponseObject } from './types';

function isNodeVersionElementValid(data: unknown): data is ResponseObject {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Element of Node.js versions is not an object');
  }
  if (!('version' in data && typeof data.version === 'string')) {
    throw new Error("Element of Node.js versions does not have a 'version' property");
  }
  if (!('lts' in data ? (typeof data.lts === 'boolean' && data.lts === false) || typeof data.lts === 'string' : true)) {
    throw new Error("Element of Node.js versions does not have a 'lts' property");
  }
  if (!('date' in data && typeof data.date === 'string')) {
    throw new Error("Element of Node.js versions does not have a 'date' property");
  }

  return true;
}

export function isNodeVersionsResponseValid(data: unknown): data is ResponseObject[] {
  if (!Array.isArray(data)) {
    throw new Error('Node.js versions is not an array');
  }

  if (data.length === 0) {
    throw new Error('Node.js versions is empty');
  }

  return data.every(isNodeVersionElementValid);
}
