import * as crypto from 'crypto-js'

export function convertWordArrayToUint8Array(wordArray: crypto.lib.WordArray): Uint8Array {
	const len = wordArray.words.length
	const u8_array = new Uint8Array(len << 2)
	let offset = 0
	let word
	let i
	for (i=0; i<len; i++) {
		word = wordArray.words[i];
		u8_array[offset++] = word >> 24;
		u8_array[offset++] = (word >> 16) & 0xff;
		u8_array[offset++] = (word >> 8) & 0xff;
		u8_array[offset++] = word & 0xff;
	}
	return u8_array;
}

export function longToUint8Array(value: number): crypto.lib.WordArray {
    const data = new ArrayBuffer(8)
    new DataView(data).setBigUint64(0, BigInt(value), false)
    return crypto.lib.WordArray.create(data)
}