import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";

interface PasswordLength {
  length: string;
}

interface Preferences {
  defaultPasswordLength: string;
}

export default async function main(props: { arguments?: PasswordLength }) {
  const preferences = getPreferenceValues<Preferences>();
  let length = parseInt(preferences.defaultPasswordLength);
  console.log(length);
  const arg = props.arguments;
  if (arg?.length !== "") {
    length = parseInt(arg!.length);
  }
  const l = "abcdefghijklmnopqrstuvwxyz";
  const u = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const n = "0123456789";
  const s = "<>.!@#$%^&*_-+=";

  function getToken(_str: string) {
    return _str.charAt(Math.floor(Math.random() * 10000) % _str.length);
  }

  function type() {
    return Math.floor(Math.random() * 100) % 3;
  }

  function getBlock(_blockArr: string[]) {
    let blockString = "";
    for (let i = 0; i < _blockArr.length; i++) {
      const j = Math.floor(Math.random() * (i + 1));
      [_blockArr[i], _blockArr[j]] = [_blockArr[j], _blockArr[i]];
    }
    for (let k = 0; k < _blockArr.length; k++) {
      blockString += _blockArr[k];
    }
    return blockString;
  }

  async function generatePassword(_length: number) {
    let password = "";
    let block: string[] = [];
    let kk = 0;
    for (let i = 0; i < _length; i++) {
      switch (true) {
        case kk == 0: {
          block.push(getToken(n));
          kk++;
          break;
        }
        case kk == 1: {
          block.push(getToken(u));
          kk++;
          break;
        }
        case kk == 2:
        case kk == 3: {
          block.push(getToken(l));
          kk++;
          break;
        }
        case kk == 4: {
          block.push(getToken(l + u));
          kk++;
          break;
        }
        case kk == 7: {
          password += getBlock(block);
          password += getToken(s);
          kk = 0;
          block = [];

          break;
        }
        case kk == 5:
        case kk == 6: {
          switch (type()) {
            case 0: {
              password += getBlock(block);
              password += getToken(s);
              kk = 0;
              block = [];

              break;
            }
            default: {
              block.push(getToken(l + u + n));
              kk++;
              break;
            }
          }
          break;
        }
      }
    }
    password += getBlock(block);
    return password;
  }
  const password = await generatePassword(length);
  await Clipboard.copy(password);

  await showHUD("🎉 A randon password has been copied to clipboard");
}
