import * as crypto from 'crypto-js'
import { base32decode } from './base32'
import { convertWordArrayToUint8Array, longToUint8Array } from './array-util'

const SALT = "VbAnHr^rkkAy6D!Q"

export function decodeDeriveKey(deviceID: string): string {
    return crypto.enc.Hex.stringify(
        crypto.PBKDF2(
            deviceID, 
            SALT, 
            {
                keySize: 256 / 32,
                iterations: 120000,
                hasher: crypto.algo.SHA512
            }
        )
    )
}

export function decodeSecretKey(masterKey: string, passphrase: string, ivKey: string): string {
    const decodePassphrase = base32decode(passphrase)
    const ivKeyValueDecode = base32decode(ivKey)
    const decrypted = crypto.AES.decrypt(
        crypto.enc.Base64.stringify(decodePassphrase),
        crypto.enc.Hex.parse(masterKey),
        { iv: ivKeyValueDecode, mode: crypto.mode.CBC, padding: crypto.pad.Pkcs7 }
    )
    const hexDecodeDecryptedKey = crypto.enc.Hex.parse(decrypted.toString())
    const decodedKey = base32decode(hexDecodeDecryptedKey.toString(crypto.enc.Utf8))
    return crypto.enc.Hex.stringify(decodedKey)
}

export function calculateHOTP(secretKey: string, period: number, digits: number): string {
    const currentTimeMillis = Math.floor(Date.now() / 1000)
    const timestamp = Math.floor(currentTimeMillis / period)
    const data = longToUint8Array(timestamp)
    const hexData = crypto.enc.Hex.stringify(data)
    const generateH = generateHash(hexData, secretKey)
    const hash = convertWordArrayToUint8Array(generateH)
    const offset = hash[hash.length - 1] & 15
    const otpNumber = ((hash[offset] & 0x7f) << 24) 
        | ((hash[offset + 1] & 0xff) << 16) 
        | ((hash[offset + 2] & 0xff) << 8) 
        | (hash[offset + 3] & 0xff)
    return (otpNumber % Math.pow(10, digits)).toString().padStart(digits, '0')
}

export function generateHash(data: string, secretKey: string): crypto.lib.WordArray {
    return crypto.HmacSHA512(crypto.enc.Hex.parse(data), crypto.enc.Hex.parse(secretKey))
}