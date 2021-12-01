import CryptoJS from "crypto-js";

const iv = CryptoJS.enc.Hex.parse("00000000000000000000000000000000");

// export const decrypt = function (data: string, key = 'zG2nSeEfSHfvTCHy5LCcqtBbQehKNLXn') {
//   const shaKey = CryptoJS.SHA256(key);
//   const decrypted = CryptoJS.AES.decrypt(data, shaKey, {
//     mode: CryptoJS.mode.CBC,
//     iv: iv,
//     padding: CryptoJS.pad.Pkcs7
//   });
//   return decrypted.toString(CryptoJS.enc.Utf8);
// };

export const decrypt = function (data: string, key = "zG2nSeEfSHfvTCHy5LCcqtBbQehKNLXn") {
  const shaKey = CryptoJS.SHA256(key);
  const decrypted = CryptoJS.AES.decrypt(data, shaKey, {
    mode: CryptoJS.mode.CBC,
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
};
