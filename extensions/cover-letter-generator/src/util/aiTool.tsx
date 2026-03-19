import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

import { environment, getPreferenceValues } from "@raycast/api";
import config = require("../config.json");
import path = require("path");

const prompt = config.prompt;
const resumePath = path.join(environment.supportPath, config.resumePath);
const apiKey = getPreferenceValues().apiKey;
const model = getPreferenceValues().model;

export async function generateCoverLetter(jobDesciption: string): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);
    const agent = genAI.getGenerativeModel({
      model: model,
      systemInstruction: prompt,
    });
    const uploadResponse = await fileManager.uploadFile(resumePath, {
      mimeType: "application/pdf",
      displayName: "ResumePDF",
    });
    const result = await agent.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      { text: `<jobDescription> ${jobDesciption} </jobDescription>` },
      { text: `Date : ${new Date().toString()}` },
    ]);
    const response = result.response.text();
    const JSONString = response.startsWith("```json") ? response.slice(7, -4) : response;
    return JSONString;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to generate cover letter");
  }
}
