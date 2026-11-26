/**
 * 先保存，成功后才更新界面。
 *
 * 用户触发的操作（改曲目顺序、改曲号、改 bounce 名）都走这里：写盘失败时界面保持原样，
 * 调用方拿到错误后提示，表单也据此决定关不关。
 */
export async function saveThenApply(
  save: () => Promise<void>,
  commit: () => void | Promise<void>,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    await save();
  } catch (error) {
    return { ok: false, error };
  }
  await commit();
  return { ok: true };
}
