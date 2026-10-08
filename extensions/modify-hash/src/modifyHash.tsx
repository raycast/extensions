/*
 * @author: tisfeng
 * @createTime: 2022-10-19 19:55
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-20 23:54
 * @fileName: modifyHash.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import RunCommand, { ActionType } from "./utils";

export default function ModifyFileHash() {
  return RunCommand(ActionType.ModifyHash);
}
