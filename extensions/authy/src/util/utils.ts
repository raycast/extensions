import getToken from "totp-generator";
import {encode} from "hi-base32";

export function genTOTP(seed: string) {
    const secret = encode(Buffer.from(seed, "hex"));
    const timestamp = new Date();
    return [
        getToken(secret, { digits: 7, period: 10, algorithm: "SHA-1", timestamp: timestamp.getTime() }),
        getToken(secret, { digits: 7, period: 10, algorithm: "SHA-1", timestamp: timestamp.getTime() + 10 * 1000 }),
        getToken(secret, { digits: 7, period: 10, algorithm: "SHA-1", timestamp: timestamp.getTime() + 10 * 2 * 1000 })
    ];
}