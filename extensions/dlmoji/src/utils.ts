import CryptoJS from "crypto-js";
import { getPreferenceValues, environment, showToast, Toast } from "@raycast/api";

export const preferences: IPreferences = getPreferenceValues()

export const defaultBaiduAppId = myDecrypt("U2FsdGVkX19nImmSLH3I5HA5KoZ9gQkd29U7YDeFaf6INsj1FXVHe3wwZ1V9/dp0");
export const defaultBaiduAppSecret = myDecrypt("U2FsdGVkX1+xWcvKDQpK7QH1Od2aUL51+25qFvSHeFlL6B8nhmPqC3WsVg5dNsCp");

export function myDecrypt(ciphertext: string) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, environment.extensionName);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  }

export function showErrorToast(name: string, msg: string) {
    showToast({
        style: Toast.Style.Failure,
        title: `API [` + name + `] Fetching Error`,
        message: msg,
    });
}

export function checkURL(str: string){
    const Expression=/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
    const objExp=new RegExp(Expression);
    return objExp.test(str)
} 

export function truncate(string: string, length = 16, separator = "..") {
    if (string.length <= length) return string

    return string.substring(0, length) + separator
}