export function generatePassword(len: number, useNumbers: boolean, useChars: boolean): string {
    let charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    if (useNumbers) {
        charset += "23456789";
    }
    if (useChars) {
        charset += "!@#$*^&%";
    }
    let retVal = "";
    for (let i = 0, n = charset.length; i < len; ++i) {
        // console.log('charset', charset);
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}
