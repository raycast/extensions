import * as fs from "fs";

export const getBase64Url = async (imagePath: string): Promise<string> => {
  const fileBuffer = fs.readFileSync(imagePath);

  // Convert the file to a base64 string
  const base64Image = fileBuffer.toString("base64");

  return `data:image/jpeg;base64,${base64Image}`;
};
