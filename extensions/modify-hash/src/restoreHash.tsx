/*
 * @author: tisfeng
 * @createTime: 2022-10-19 21:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-20 23:54
 * @fileName: restoreHash.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import RunCommand, { ActionType } from "./utils";

export default function RestoreFileHash() {
  return RunCommand(ActionType.RestoreHash);
}
