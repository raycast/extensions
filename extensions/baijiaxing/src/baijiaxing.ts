import { Clipboard, showHUD } from "@raycast/api";

// 百家姓映射表
const nameMap: { [key: string]: string } = {
  赵: "0",
  钱: "1",
  孙: "2",
  李: "3",
  周: "4",
  吴: "5",
  郑: "6",
  王: "7",
  冯: "8",
  陈: "9",
  褚: "a",
  卫: "b",
  蒋: "c",
  沈: "d",
  韩: "e",
  杨: "f",
  朱: "g",
  秦: "h",
  尤: "i",
  许: "j",
  何: "k",
  吕: "l",
  施: "m",
  张: "n",
  孔: "o",
  曹: "p",
  严: "q",
  华: "r",
  金: "s",
  魏: "t",
  陶: "u",
  姜: "v",
  戚: "w",
  谢: "x",
  邹: "y",
  喻: "z",
  福: "A",
  水: "B",
  窦: "C",
  章: "D",
  云: "E",
  苏: "F",
  潘: "G",
  葛: "H",
  奚: "I",
  范: "J",
  彭: "K",
  郎: "L",
  鲁: "M",
  韦: "N",
  昌: "O",
  马: "P",
  苗: "Q",
  凤: "R",
  花: "S",
  方: "T",
  俞: "U",
  任: "V",
  袁: "W",
  柳: "X",
  唐: "Y",
  罗: "Z",
  薛: ".",
  伍: "-",
  余: "_",
  米: "+",
  贝: "=",
  姚: "/",
  孟: "?",
  顾: "#",
  尹: "%",
  江: "&",
  钟: "*",
  竺: ":",
  赖: "|",
};

const magnetHeader = "magnet:?xt=urn:btih:";

function isLink(text: string): boolean {
  const regex = /^[\u4E00-\u9FA5]+$/;
  return regex.test(text);
}

function isMagnet(text: string): boolean {
  const regex = /^magnet:\?xt=urn:btih:[0-9a-fA-F]{40,}.*$/;
  return regex.test(text);
}

function transToMagnet(str: string): string {
  str = str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
  const strc = str.split("");
  let c = "";
  for (let i = 0; i < strc.length; i++) {
    const o = nameMap[strc[i]] || "";
    c += o;
  }
  return isMagnet(magnetHeader + c) ? magnetHeader + c : c;
}

function transToName(str: string): string {
  str = str.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
  const v = str.replace(/magnet:\?xt=urn:btih:/, "");
  const strc = v.split("");
  let a = "";
  for (let i = 0; i < strc.length; i++) {
    for (const [key, value] of Object.entries(nameMap)) {
      if (value === strc[i]) {
        a += key;
        break;
      }
    }
  }
  return a;
}

export default async function Command() {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("剪贴板为空");
      return;
    }

    // 判断是百家姓还是链接
    const convertedText = isLink(clipboardText) ? transToMagnet(clipboardText) : transToName(clipboardText);

    await Clipboard.copy(convertedText);
    await showHUD("已复制转换结果到剪贴板");
  } catch (error) {
    await showHUD("转换失败");
    console.error(error);
  }
}
