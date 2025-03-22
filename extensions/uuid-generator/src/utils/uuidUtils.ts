import { addToHistory, UUIDType } from "../uuidHistory"; // Adjust the path based on your directory structure

export async function generateUuids(
  uuidGenerator: () => string,
  numberOfUuids: number,
  upperCaseLetters = false,
  type: UUIDType = UUIDType.UUIDV4
): Promise<string[]> {
  const uuids = Array.from(Array(numberOfUuids)).map(() => {
    const newUuid = uuidGenerator();
    return upperCaseLetters ? newUuid.toUpperCase() : newUuid;
  });

  for (const uuid of uuids) {
    await addToHistory(uuid, type);
  }

  return uuids;
}
