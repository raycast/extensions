import { OpenAI } from "openai";
import { Toast, getPreferenceValues, showToast } from "@raycast/api";

async function isValidImageUrl(url: string): Promise<boolean> {
  // URL이 http 또는 https로 시작하는지 확인
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  // 정규 표현식을 사용하여 파일 확장자 체크
  const regex = /\.(jpeg|jpg|png|webp)(\?.*)?$/;
  if (!regex.test(url)) {
    // 정규 표현식을 통과하지 못했으면 HTTP 헤더를 통해 content type 확인
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");
      // contentType이 image로 시작하는지 확인하고, 'image/gif'가 아닌지도 체크
      return contentType ? contentType.startsWith("image/") && !contentType.includes("gif") : false;
    } catch (error) {
      console.error("Error checking image URL:", error);
      return false;
    }
  }
  // 정규 표현식을 통과했다면 유효한 이미지 URL로 간주
  return true;
}

export class ImageToTextProcessor {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  public async processSelectedImage(imageUrl: string, maxTokens?: number) {
    showToast(Toast.Style.Animated, "✍🏼 Requesting image description...");

    const isValid = await isValidImageUrl(imageUrl);
    if (!isValid) {
      showToast(
        Toast.Style.Failure,
        "Invalid image URL or unsupported format. Only JPEG, PNG, and WEBP URLs are supported.",
      );
      throw new Error("Invalid image URL or unsupported format. Only JPEG, PNG, and WEBP URLs are supported.");
    }

    const preferences = getPreferenceValues<Preferences>();
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Describe the image in ${preferences.outputLanguage}` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      });
      showToast(Toast.Style.Success, "✅ Image description received");
      return response.choices[0].message.content;
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to process image");
      throw error;
    }
  }
}
