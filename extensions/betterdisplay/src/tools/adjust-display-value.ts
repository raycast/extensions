type AdjustInput = {
  tagID: string;
  increment?: number;
};

export async function adjustDisplayValue(
  input: AdjustInput,
  checkAvailability: (tagID: string) => Promise<boolean>,
  adjust: (tagID: string, increment?: number) => Promise<string>,
): Promise<string | false> {
  if (!(await checkAvailability(input.tagID))) {
    return false;
  }

  const increment =
    typeof input.increment === "number" && input.increment >= 0 && input.increment <= 1 ? input.increment : undefined;

  try {
    return await adjust(input.tagID, increment);
  } catch {
    return false;
  }
}
