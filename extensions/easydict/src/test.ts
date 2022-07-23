/*
 * @author: tisfeng
 * @createTime: 2022-07-22 17:26
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-22 23:35
 * @fileName: test.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

testWithoutParams();

export function testWithParams(queryText: string, fromLanguage: string, targetLanguage: string) {
  console.log(`${fromLanguage} -> ${targetLanguage}: ${queryText}`);
}

export function testWithoutParams() {
  console.log("testWithoutParams");
}
