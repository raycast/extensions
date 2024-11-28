import { todayUid } from "./utils";
import * as roamApiSdk from "./roam-api-sdk-copy";

// TODO: 优化, 太多写死代码了. 测试代码在这里 https://codesandbox.io/s/goofy-ace-052tk6?file=/src/t.test.ts

const roamCreateBlockGivenParentUid = (
  parentUid: string | number,
  str: string,
  uid: number
): roamApiSdk.RoamCreateBlock => {
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

const roamCreateBlockWithDnpAsParent = (dnpUid: string, str: string, uid: number): roamApiSdk.RoamCreateBlock => {
  return {
    action: "create-block",
    location: {
      // When we use page-title, if page does not exist already, it will create the page
      "page-title": { "daily-note-page": dnpUid },
      order: "last",
    },
    block: {
      string: str,
      uid: uid,
    },
  };
};

export const tagPageTitlesStrSuffix = (pageTitlesToTagTopBlockWith: string[]) => {
  const hasTitles = pageTitlesToTagTopBlockWith && pageTitlesToTagTopBlockWith.length > 0;
  if (!hasTitles) {
    return "";
  } else {
    return pageTitlesToTagTopBlockWith.reduce(
      (accStr: string, newPageTitle: string) => accStr + " #[[" + newPageTitle + "]]",
      ""
    );
  }
};

const geneStartUids = (count: number) => {
  return new Array(count).fill(0).map((v, i, arr) => {
    return i === 0 ? -1 : i * count * 10 * -1;
  });
};
const today = todayUid();
export const parseTemplate = (
  template: string,
  pageTitlesToTagTopBlockWith: string[],
  existingPageUid?: string
): roamApiSdk.RoamSingleAction[] => {
  const topLevelCreateBlock = (str: string, uid: number) => {
    const finalStr = str + tagPageTitlesStrSuffix(pageTitlesToTagTopBlockWith);
    if (existingPageUid) {
      return roamCreateBlockGivenParentUid(existingPageUid, finalStr, uid);
    } else {
      return roamCreateBlockWithDnpAsParent(today, finalStr, uid);
    }
  };
  const paragraphs = template.split("\n");
  const uids = geneStartUids(paragraphs.length);
  // Note: as long as the first of the return value is from a call to `topLevelCreateBlock`
  //   we can be sure that the page exists before adding blocks
  //   See the if, else if below and also the `const result` defined a few lines below
  if (!template.startsWith("- ")) {
    return [topLevelCreateBlock(template, uids[0])];
  } else if (!/\n(\s*)-\s/g.test(template)) {
    return [topLevelCreateBlock(template.substring(2), uids[0])];
  }
  const REG = /\n(\s*)(-\s)/g;
  const regResult = REG.exec(template)!;
  let latestLevel = 0;
  const bstr = template.substring(2, regResult.index);
  template = template.substring(regResult.index);
  const result = [topLevelCreateBlock(bstr, uids[0]--)];
  const REG1 = /\n(\s*)-\s(.+)?\n\s*-\s/gs;
  let reg1Result = REG1.exec(template);
  // console.log(uids, "--- uids");

  while (reg1Result) {
    const [r0, r1, r2] = reg1Result;
    // console.log(template.length, r0.length, r1, r1.length,  r2, r2.length,r2.match(/\n/g).length, ' --------')
    const v = template.substring(0, reg1Result.length + r2.length + r1.length);
    const nCounts = v.match(/\n/g)?.length || 0;
    template = template.substring(reg1Result.length + r2.length + nCounts);
    let currentLevel = r1.length;
    // console.log(v, " -", currentLevel, r0, r1, r2);

    // 重置父级位置
    if (currentLevel - latestLevel > 1) {
      currentLevel = latestLevel + 1;
      result.push(roamCreateBlockGivenParentUid(uids[currentLevel - 1] + 1, r2, uids[currentLevel]--));
    } else if (currentLevel === 0) {
      // TODO: figure out when does this happen?
      result.push(topLevelCreateBlock(r2, uids[currentLevel]--));
    } else {
      result.push(roamCreateBlockGivenParentUid(uids[currentLevel - 1] + 1, r2, uids[currentLevel]--));
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
    // console.log(template, "@", trimStart, currentLevel, template.length, trimStart.length);
    const parentUid = currentLevel === 0 ? today : uids[currentLevel - 1] + 1;
    if (trimStart.startsWith("- ")) {
      result.push(roamCreateBlockGivenParentUid(parentUid, trimStart.substring(2), uids[currentLevel]--));
    } else {
      result.push(roamCreateBlockGivenParentUid(parentUid, trimStart, uids[currentLevel]--));
    }
  }

  return result;
};
