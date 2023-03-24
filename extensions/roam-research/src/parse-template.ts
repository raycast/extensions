import { todayUid } from "./utils";

// TODO: 优化, 太多写死代码了. 测试代码在这里 https://codesandbox.io/s/goofy-ace-052tk6?file=/src/t.test.ts

const geneAction = (parentUid: string | number, str: string, uid: number) => {
  return {
    action: "create-block",
    location: {
      "parent-uid": parentUid,
      order: "last",
    },
    block: {
      string: str,
      uid,
    },
  };
};

const geneStartUids = (count: number) => {
  return new Array(count).fill(0).map((v, i, arr) => {
    return i === 0 ? -1 : i * count * 10 * -1;
  });
};
const today = todayUid();
export const parseTemplate = (template: string) => {
  const paragraphs = template.split("\n");
  const uids = geneStartUids(paragraphs.length);
  if (!template.startsWith("- ")) {
    return [geneAction(today, template, uids[0])];
  } else if (!/\n(\s*)-\s/g.test(template)) {
    return [geneAction(today, template.substring(2), uids[0])];
  }
  const REG = /\n(\s*)(-\s)/g;
  const regResult = REG.exec(template)!;
  let latestLevel = 0;
  const bstr = template.substring(2, regResult.index);
  template = template.substring(regResult.index);
  const result = [geneAction(today, bstr, uids[0]--)];
  const REG1 = /\n(\s*)-\s(.+)?\n\s*-\s/gs;
  let reg1Result = REG1.exec(template);
  console.log(uids, "--- uids");

  while (reg1Result) {
    const [r0, r1, r2] = reg1Result;
    // console.log(template.length, r0.length, r1, r1.length,  r2, r2.length,r2.match(/\n/g).length, ' --------')
    const v = template.substring(0, reg1Result.length + r2.length + r1.length);
    const nCounts = v.match(/\n/g)?.length || 0;
    template = template.substring(reg1Result.length + r2.length + nCounts);
    let currentLevel = r1.length;
    console.log(v, " -", currentLevel, r0, r1, r2);

    // 重置父级位置
    if (currentLevel - latestLevel > 1) {
      currentLevel = latestLevel + 1;
      result.push(geneAction(uids[currentLevel - 1] + 1, r2, uids[currentLevel]--));
    } else if (currentLevel === 0) {
      result.push(geneAction(today + "", r2, uids[currentLevel]--));
    } else {
      result.push(geneAction(uids[currentLevel - 1] + 1, r2, uids[currentLevel]--));
    }
    latestLevel = currentLevel;
    reg1Result = REG1.exec(template);
  }
  if (template) {
    if (template.startsWith("\n")) {
      template = template.substring(1);
    }
    const trimStart = template.replace(/^\s*/gi, "");
    const currentLevel = template.length - trimStart.length;
    console.log(template, "@", trimStart, currentLevel, template.length, trimStart.length);
    const parentUid = currentLevel === 0 ? today : uids[currentLevel - 1] + 1;
    if (trimStart.startsWith("- ")) {
      result.push(geneAction(parentUid, trimStart.substring(2), uids[currentLevel]--));
    } else {
      result.push(geneAction(parentUid, trimStart, uids[currentLevel]--));
    }
  }

  return result;
};
