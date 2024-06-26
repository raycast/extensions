import { base32nopad } from '@scure/base';
import * as crypto from 'crypto-js'

export function base32decode(value: string): crypto.lib.WordArray {
    return crypto.lib.WordArray.create(base32nopad.decode(value))
}