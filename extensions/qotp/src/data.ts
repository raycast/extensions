import { authenticator } from "otplib";
import { secret, passphrase, genCodeCount, pin } from "./preferences";
import { generate } from "./utils";

const CodeList = genCode();
const ExtraList = getExtraList();

export { CodeList, ExtraList };

export function genCode() {
  const list = Array.from({ length: genCodeCount }).map((_, idx) => {
    const code = generate(secret, idx);
    const item: IOTPItem = {
      title: code,
      arg: pin + code,
    };
    if (idx === 0) {
      item.timeLeft = authenticator.timeRemaining();
    }
    return item;
  });
  return list;
}

export function getExtraList(): IOTPItem[] {
  const items = [
    {
      title: "secret",
      arg: secret,
    },
  ];

  if (passphrase) {
    items.push({
      // title: "跳板机登录线上机器的密码",
      title: "passphrase",
      arg: passphrase,
    });
  }
  return items;
}

export interface IOTPItem {
  title: string;
  subtitle?: string;
  arg: string;
  timeLeft?: number;
}
