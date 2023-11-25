/*
 * @author: tisfeng
 * @createTime: 2022-10-24 18:48
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-24 18:55
 * @fileName: zipCompress.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import RunCommand, { ActionType } from "./utils";

export default function zipCompress() {
  return RunCommand(ActionType.ZipCompress);
}
