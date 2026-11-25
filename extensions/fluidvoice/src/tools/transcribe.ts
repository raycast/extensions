import { transcribeSource } from "../utils/media";

type Input = {
  /** One HTTP(S) media URL, file URL, or absolute local audio/video file path. */
  source: string;
};

export default async function tool({ source }: Input) {
  const result = await transcribeSource(source);
  return result.text;
}
